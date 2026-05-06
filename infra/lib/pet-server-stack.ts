import path from 'node:path';

import type { StackProps } from 'aws-cdk-lib';
import { CfnOutput, Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import {
  ApiMapping,
  CorsHttpMethod,
  DomainName,
  HttpApi,
  HttpMethod,
  HttpStage,
} from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import {
  Architecture,
  DockerImageCode,
  DockerImageFunction,
} from 'aws-cdk-lib/aws-lambda';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { CfnRecordSet } from 'aws-cdk-lib/aws-route53';
import type { Construct } from 'constructs';

type RequiredEnvKey =
  | 'DATABASE_URL'
  | 'JWT_ACCESS_SECRET'
  | 'JWT_REFRESH_SECRET'
  | 'KAKAO_CLIENT_ID'
  | 'KAKAO_CLIENT_SECRET'
  | 'KAKAO_REDIRECT_URI';

type OptionalEnvWithDefaultKey =
  | 'JWT_ACCESS_EXPIRES_IN'
  | 'JWT_REFRESH_EXPIRES_IN'
  | 'NODE_ENV'
  | 'PORT'
  | 'AWS_LWA_PORT'
  | 'SKIP_MIGRATE'
  | 'STAGE';

type OptionalEnvKey =
  | 'DATABASE_URL'
  | 'UPLOADS_BUCKET'
  | 'UPLOADS_REGION'
  | 'UPLOADS_CDN_DOMAIN'
  | 'UPLOADS_MAX_SIZE'
  | 'UPLOADS_URL_EXPIRES_IN'
  | OptionalEnvWithDefaultKey;

type DomainEnvKey = 'API_DOMAIN' | 'API_CERT_ARN' | 'API_HOSTED_ZONE_ID';

interface ApiDomainConfig {
  readonly domainName: string;
  readonly certificateArn: string;
  readonly hostedZoneId?: string;
}

interface PetServerStackProps extends StackProps {
  readonly stage: string;
}

const stageScopedKey = (stage: string, key: string): string =>
  `PET_SERVER_${stage.toUpperCase()}_${key}`;

const envOrContext = (stage: string, key: string): string | undefined =>
  process.env[stageScopedKey(stage, key)] ?? process.env[key];

const collectRequiredEnv = (
  stage: string,
  keys: readonly RequiredEnvKey[],
): Record<RequiredEnvKey, string> => {
  const entries = keys.map<[RequiredEnvKey, string]>((key) => {
    const value = envOrContext(stage, key);

    if (!value) {
      throw new Error(
        `환경 변수가 필요합니다: ${stageScopedKey(stage, key)} 또는 ${key}`,
      );
    }

    return [key, value];
  });

  return Object.fromEntries(entries) as Record<RequiredEnvKey, string>;
};

const optionalEnvDefaults: Record<OptionalEnvWithDefaultKey, (stage: string) => string> =
  {
    AWS_LWA_PORT: () => '3000',
    JWT_ACCESS_EXPIRES_IN: () => '15m',
    JWT_REFRESH_EXPIRES_IN: () => '14d',
    NODE_ENV: (stage) => (stage === 'prod' ? 'production' : 'development'),
    PORT: () => '3000',
    SKIP_MIGRATE: () => '1',
    STAGE: (stage) => stage,
  };

const collectOptionalEnv = (
  stage: string,
  defaults: Record<OptionalEnvWithDefaultKey, (stage: string) => string>,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(defaults).map(([key, fallback]) => [
      key,
      envOrContext(stage, key) ?? fallback(stage),
    ]),
  );

const maybeEnv = (stage: string, key: OptionalEnvKey): Record<string, string> => {
  const value = envOrContext(stage, key);
  return value ? { [key]: value } : {};
};

const trimOrUndefined = (value: string | undefined): string | undefined =>
  value?.trim() ? value.trim() : undefined;

const resolveApiDomainConfig = (stage: string): ApiDomainConfig | null => {
  const resolve = (key: DomainEnvKey): string | undefined =>
    trimOrUndefined(envOrContext(stage, key));

  const domainName = resolve('API_DOMAIN');
  const certificateArn = resolve('API_CERT_ARN');

  if (!domainName || !certificateArn) {
    return null;
  }

  return {
    domainName,
    certificateArn,
    hostedZoneId: resolve('API_HOSTED_ZONE_ID'),
  };
};

const createLambdaFunction = (
  scope: Construct,
  stage: string,
  environment: Record<string, string>,
): DockerImageFunction => {
  const functionName = `pet-server-${stage}`;
  const codeAssetPath = path.resolve(__dirname, '..', '..');

  const logGroup = new LogGroup(scope, 'PetServerLogGroup', {
    logGroupName: `/aws/lambda/${functionName}`,
    retention: RetentionDays.TWO_WEEKS,
    removalPolicy: RemovalPolicy.DESTROY,
  });

  const lambdaFunction = new DockerImageFunction(scope, 'PetServerFunction', {
    functionName,
    description: `pet-server ${stage} 환경 API 백엔드`,
    architecture: Architecture.ARM_64,
    memorySize: 512,
    timeout: Duration.seconds(20),
    code: DockerImageCode.fromImageAsset(codeAssetPath, {
      file: 'Dockerfile',
    }),
    environment,
    logGroup,
  });

  lambdaFunction.applyRemovalPolicy(RemovalPolicy.DESTROY);
  return lambdaFunction;
};

interface HttpResources {
  readonly httpApi: HttpApi;
  readonly httpStage: HttpStage;
}

const resolveStageName = (stage: string): string =>
  stage === 'prod' ? '$default' : stage;

const createHttpResources = (
  scope: Construct,
  stage: string,
  integration: HttpLambdaIntegration,
): HttpResources => {
  const httpApi = new HttpApi(scope, 'PetServerHttpApi', {
    apiName: `pet-server-${stage}`,
    defaultIntegration: integration,
    createDefaultStage: false,
    corsPreflight: {
      allowCredentials: false,
      allowHeaders: ['*'],
      allowMethods: [
        CorsHttpMethod.GET,
        CorsHttpMethod.HEAD,
        CorsHttpMethod.OPTIONS,
        CorsHttpMethod.POST,
        CorsHttpMethod.PUT,
        CorsHttpMethod.PATCH,
        CorsHttpMethod.DELETE,
      ],
      allowOrigins: ['*'],
      maxAge: Duration.days(1),
    },
  });

  httpApi.addRoutes({
    path: '/',
    methods: [HttpMethod.ANY],
    integration,
  });

  httpApi.addRoutes({
    path: '/{proxy+}',
    methods: [HttpMethod.ANY],
    integration,
  });

  const httpStage = new HttpStage(scope, 'PetServerStage', {
    httpApi,
    stageName: resolveStageName(stage),
    autoDeploy: true,
  });

  return { httpApi, httpStage };
};

const attachCustomDomain = (
  scope: Construct,
  stage: string,
  httpApi: HttpApi,
  httpStage: HttpStage,
): void => {
  const apiDomainConfig = resolveApiDomainConfig(stage);

  if (!apiDomainConfig) {
    return;
  }

  const certificate = Certificate.fromCertificateArn(
    scope,
    'PetServerApiCertificate',
    apiDomainConfig.certificateArn,
  );

  const domain = new DomainName(scope, 'PetServerCustomDomain', {
    domainName: apiDomainConfig.domainName,
    certificate,
  });

  new ApiMapping(scope, 'PetServerApiMapping', {
    api: httpApi,
    domainName: domain,
    stage: httpStage,
  });

  if (apiDomainConfig.hostedZoneId) {
    new CfnRecordSet(scope, 'PetServerApiAliasRecord', {
      hostedZoneId: apiDomainConfig.hostedZoneId,
      name: apiDomainConfig.domainName,
      type: 'A',
      aliasTarget: {
        dnsName: domain.regionalDomainName,
        hostedZoneId: domain.regionalHostedZoneId,
        evaluateTargetHealth: false,
      },
    });
  }
};

const addStageOutputs = (scope: Stack, stageUrl: string): void => {
  new CfnOutput(scope, 'HttpApiUrl', {
    value: stageUrl,
    description: 'API Gateway HTTP API 엔드포인트',
  });

  new CfnOutput(scope, 'HttpApiDocsUrl', {
    value: `${stageUrl}/api-docs`,
    description: 'Swagger UI 경로 (/api-docs)',
  });
};

export class PetServerStack extends Stack {
  constructor(scope: Construct, id: string, props: PetServerStackProps) {
    super(scope, id, props);

    const { stage } = props;

    const requiredEnv = collectRequiredEnv(stage, [
      'DATABASE_URL',
      'JWT_ACCESS_SECRET',
      'JWT_REFRESH_SECRET',
      'KAKAO_CLIENT_ID',
      'KAKAO_CLIENT_SECRET',
      'KAKAO_REDIRECT_URI',
    ]);

    const optionalEnv = {
      ...collectOptionalEnv(stage, optionalEnvDefaults),
      ...maybeEnv(stage, 'DATABASE_URL'),
      ...maybeEnv(stage, 'UPLOADS_BUCKET'),
      ...maybeEnv(stage, 'UPLOADS_REGION'),
      ...maybeEnv(stage, 'UPLOADS_CDN_DOMAIN'),
      ...maybeEnv(stage, 'UPLOADS_MAX_SIZE'),
      ...maybeEnv(stage, 'UPLOADS_URL_EXPIRES_IN'),
    };

    const lambdaFunction = createLambdaFunction(this, stage, {
      ...requiredEnv,
      ...optionalEnv,
    });

    const integration = new HttpLambdaIntegration('PetServerIntegration', lambdaFunction);
    const { httpApi, httpStage } = createHttpResources(this, stage, integration);

    attachCustomDomain(this, stage, httpApi, httpStage);
    addStageOutputs(this, httpStage.url);
  }
}

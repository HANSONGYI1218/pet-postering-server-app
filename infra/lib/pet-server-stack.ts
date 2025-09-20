import path from 'node:path';

import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  StackProps,
} from 'aws-cdk-lib';
import { Architecture, DockerImageCode, DockerImageFunction } from 'aws-cdk-lib/aws-lambda';
import { HttpApi, HttpMethod, CorsHttpMethod, HttpStage } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

type RequiredEnvKey =
  | 'DATABASE_URL'
  | 'JWT_ACCESS_SECRET'
  | 'JWT_REFRESH_SECRET'
  | 'KAKAO_CLIENT_ID'
  | 'KAKAO_CLIENT_SECRET'
  | 'KAKAO_REDIRECT_URI';

type OptionalEnvKey =
  | 'DIRECT_DATABASE_URL'
  | 'JWT_ACCESS_EXPIRES_IN'
  | 'JWT_REFRESH_EXPIRES_IN'
  | 'NODE_ENV'
  | 'PORT'
  | 'AWS_LWA_PORT'
  | 'SKIP_MIGRATE'
  | 'STAGE';

interface PetServerStackProps extends StackProps {
  readonly stage: string;
}

const stageScopedKey = (stage: string, key: string): string =>
  `PET_SERVER_${stage.toUpperCase()}_${key}`;

const envOrContext = (stage: string, key: string): string | undefined =>
  process.env[stageScopedKey(stage, key)] ?? process.env[key];

const collectRequiredEnv = (stage: string, keys: readonly RequiredEnvKey[]): Record<RequiredEnvKey, string> => {
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

const optionalEnvDefaults: Record<Exclude<OptionalEnvKey, 'DIRECT_DATABASE_URL'>, (stage: string) => string> = {
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
  defaults: Record<string, (stage: string) => string>,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(defaults).map(([key, fallback]) => [key, envOrContext(stage, key) ?? fallback(stage)]),
  );

const maybeEnv = (stage: string, key: OptionalEnvKey): Record<string, string> => {
  const value = envOrContext(stage, key);
  return value ? { [key]: value } : {};
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
      ...maybeEnv(stage, 'DIRECT_DATABASE_URL'),
    };

    const functionName = `pet-server-${stage}`;
    const codeAssetPath = path.resolve(__dirname, '..', '..');

    const logGroup = new LogGroup(this, 'PetServerLogGroup', {
      logGroupName: `/aws/lambda/${functionName}`,
      retention: RetentionDays.TWO_WEEKS,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const lambdaFunction = new DockerImageFunction(this, 'PetServerFunction', {
      functionName,
      description: `pet-server ${stage} 환경 API 백엔드`,
      architecture: Architecture.ARM_64,
      memorySize: 512,
      timeout: Duration.seconds(20),
      code: DockerImageCode.fromImageAsset(codeAssetPath, {
        file: 'Dockerfile',
      }),
      environment: {
        ...requiredEnv,
        ...optionalEnv,
      },
      logGroup,
    });

    const integration = new HttpLambdaIntegration('PetServerIntegration', lambdaFunction);

    const httpApi = new HttpApi(this, 'PetServerHttpApi', {
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

    const httpStage = new HttpStage(this, 'PetServerStage', {
      httpApi,
      stageName: stage,
      autoDeploy: true,
    });

    const stageUrl = httpStage.url ?? httpApi.apiEndpoint;

    lambdaFunction.applyRemovalPolicy(RemovalPolicy.DESTROY);

    new CfnOutput(this, 'HttpApiUrl', {
      value: stageUrl,
      description: 'API Gateway HTTP API 엔드포인트',
    });

    new CfnOutput(this, 'HttpApiDocsUrl', {
      value: `${stageUrl}/api-docs`,
      description: 'Swagger UI 경로 (/api-docs)',
    });
  }
}

import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';

import { PetServerStack } from '../lib/pet-server-stack';

const STAGE = 'prod';
const DOMAIN_ENV_KEY = `PET_SERVER_${STAGE.toUpperCase()}_API_DOMAIN`;
const CERT_ENV_KEY = `PET_SERVER_${STAGE.toUpperCase()}_API_CERT_ARN`;
const HOSTED_ZONE_ENV_KEY = `PET_SERVER_${STAGE.toUpperCase()}_API_HOSTED_ZONE_ID`;
const UPLOADS_BUCKET_ENV_KEY = `PET_SERVER_${STAGE.toUpperCase()}_UPLOADS_BUCKET`;
const UPLOADS_REGION_ENV_KEY = `PET_SERVER_${STAGE.toUpperCase()}_UPLOADS_REGION`;
const UPLOADS_CDN_DOMAIN_ENV_KEY = `PET_SERVER_${STAGE.toUpperCase()}_UPLOADS_CDN_DOMAIN`;
const UPLOADS_MAX_SIZE_ENV_KEY = `PET_SERVER_${STAGE.toUpperCase()}_UPLOADS_MAX_SIZE`;
const UPLOADS_URL_EXPIRES_IN_ENV_KEY = `PET_SERVER_${STAGE.toUpperCase()}_UPLOADS_URL_EXPIRES_IN`;

type EnvMap = Record<string, string | undefined>;

const BASE_ENV: EnvMap = {
  [`PET_SERVER_${STAGE.toUpperCase()}_DATABASE_URL`]: 'postgres://example',
  [`PET_SERVER_${STAGE.toUpperCase()}_JWT_ACCESS_SECRET`]: 'access-secret',
  [`PET_SERVER_${STAGE.toUpperCase()}_JWT_REFRESH_SECRET`]: 'refresh-secret',
  [`PET_SERVER_${STAGE.toUpperCase()}_KAKAO_CLIENT_ID`]: 'kakao-client-id',
  [`PET_SERVER_${STAGE.toUpperCase()}_KAKAO_CLIENT_SECRET`]: 'kakao-client-secret',
  [`PET_SERVER_${STAGE.toUpperCase()}_KAKAO_REDIRECT_URI`]:
    'https://furdiz.com/auth/kakao/callback',
};

const withEnv = (entries: EnvMap, assertion: () => void) => {
  const original: EnvMap = {};

  Object.entries(entries).forEach(([key, value]) => {
    original[key] = process.env[key];
    if (value === undefined) {
      Reflect.deleteProperty(process.env, key);
    } else {
      process.env[key] = value;
    }
  });

  try {
    assertion();
  } finally {
    Object.entries(original).forEach(([key, value]) => {
      if (value === undefined) {
        Reflect.deleteProperty(process.env, key);
      } else {
        process.env[key] = value;
      }
    });
  }
};

const withBaseEnv = (entries: EnvMap, assertion: () => void) => {
  withEnv({ ...BASE_ENV, ...entries }, assertion);
};

const createTemplate = () => {
  const app = new App();
  const stack = new PetServerStack(app, 'TestPetServer', {
    stage: STAGE,
    env: { account: '000000000000', region: 'ap-northeast-2' },
  });

  return Template.fromStack(stack);
};

describe('PetServerStack custom domain', () => {
  it('도메인 설정이 없으면 커스텀 도메인 리소스를 만들지 않는다', () => {
    withBaseEnv(
      {
        [DOMAIN_ENV_KEY]: undefined,
        [CERT_ENV_KEY]: undefined,
        [HOSTED_ZONE_ENV_KEY]: undefined,
      },
      () => {
        const template = createTemplate();

        template.resourceCountIs('AWS::ApiGatewayV2::DomainName', 0);
        template.resourceCountIs('AWS::ApiGatewayV2::ApiMapping', 0);
        template.resourceCountIs('AWS::Route53::RecordSet', 0);
      },
    );
  });

  it('도메인과 인증서를 제공하면 API Gateway 커스텀 도메인을 생성한다', () => {
    const domainName = 'api.furdiz.com';
    const certificateArn = 'arn:aws:acm:ap-northeast-2:000000000000:certificate/example';

    withBaseEnv(
      {
        [DOMAIN_ENV_KEY]: domainName,
        [CERT_ENV_KEY]: certificateArn,
        [HOSTED_ZONE_ENV_KEY]: undefined,
      },
      () => {
        const template = createTemplate();

        template.hasResourceProperties('AWS::ApiGatewayV2::DomainName', {
          DomainName: domainName,
          DomainNameConfigurations: [
            {
              CertificateArn: certificateArn,
            },
          ],
        });

        template.hasResourceProperties('AWS::ApiGatewayV2::ApiMapping', {
          Stage: '$default',
        });
      },
    );
  });

  it('호스티드 존 ID가 있으면 Route53 Alias 레코드를 생성한다', () => {
    const domainName = 'api.furdiz.com';
    const certificateArn = 'arn:aws:acm:ap-northeast-2:000000000000:certificate/example';
    const hostedZoneId = 'Z1234567890';

    withBaseEnv(
      {
        [DOMAIN_ENV_KEY]: domainName,
        [CERT_ENV_KEY]: certificateArn,
        [HOSTED_ZONE_ENV_KEY]: hostedZoneId,
      },
      () => {
        const template = createTemplate();

        template.hasResourceProperties('AWS::Route53::RecordSet', {
          Name: domainName,
          HostedZoneId: hostedZoneId,
          Type: 'A',
        });
      },
    );
  });

  it('업로드 환경 변수를 전달하면 Lambda 환경에도 반영된다', () => {
    const bucketName = 'furdiz-prod-uploads';
    const uploadsRegion = 'ap-northeast-2';
    const cdnDomain = 'https://cdn.furdiz.com';
    const maxSize = '10485760';
    const expiresIn = '300';

    withBaseEnv(
      {
        [UPLOADS_BUCKET_ENV_KEY]: bucketName,
        [UPLOADS_REGION_ENV_KEY]: uploadsRegion,
        [UPLOADS_CDN_DOMAIN_ENV_KEY]: cdnDomain,
        [UPLOADS_MAX_SIZE_ENV_KEY]: maxSize,
        [UPLOADS_URL_EXPIRES_IN_ENV_KEY]: expiresIn,
      },
      () => {
        const template = createTemplate();

        template.hasResourceProperties('AWS::Lambda::Function', {
          Environment: {
            Variables: Match.objectLike({
              UPLOADS_BUCKET: bucketName,
              UPLOADS_REGION: uploadsRegion,
              UPLOADS_CDN_DOMAIN: cdnDomain,
              UPLOADS_MAX_SIZE: maxSize,
              UPLOADS_URL_EXPIRES_IN: expiresIn,
            }),
          },
        });
      },
    );
  });
});

import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

import { PetServerStack } from '../lib/pet-server-stack';

const STAGE = 'prod';
const DOMAIN_ENV_KEY = `PET_SERVER_${STAGE.toUpperCase()}_API_DOMAIN`;
const CERT_ENV_KEY = `PET_SERVER_${STAGE.toUpperCase()}_API_CERT_ARN`;
const HOSTED_ZONE_ENV_KEY = `PET_SERVER_${STAGE.toUpperCase()}_API_HOSTED_ZONE_ID`;

type EnvMap = Record<string, string | undefined>;

const BASE_ENV: EnvMap = {
  [`PET_SERVER_${STAGE.toUpperCase()}_DATABASE_URL`]: 'postgres://example',
  [`PET_SERVER_${STAGE.toUpperCase()}_JWT_ACCESS_SECRET`]: 'access-secret',
  [`PET_SERVER_${STAGE.toUpperCase()}_JWT_REFRESH_SECRET`]: 'refresh-secret',
  [`PET_SERVER_${STAGE.toUpperCase()}_KAKAO_CLIENT_ID`]: 'kakao-client-id',
  [`PET_SERVER_${STAGE.toUpperCase()}_KAKAO_CLIENT_SECRET`]:
    'kakao-client-secret',
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
    const certificateArn =
      'arn:aws:acm:ap-northeast-2:000000000000:certificate/example';

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
    const certificateArn =
      'arn:aws:acm:ap-northeast-2:000000000000:certificate/example';
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
});

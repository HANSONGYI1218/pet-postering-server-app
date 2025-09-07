AWS에서 저렴하고 관리 쉬운 배포 (Lightsail Containers + Supabase)

개요
- 애플리케이션: AWS Lightsail Container Service (소형 플랜로 고정비, 관리형, HTTPS 제공)
- 데이터베이스: Supabase(Postgres Free/Pro). VPC 필요 없음, 간단 연결

사전 준비
1) Supabase 프로젝트 생성 → Project Settings → Connection string의 `DATABASE_URL` 확보
   - 권장: Connection Pooling(포트 6543, pgbouncer) URL 사용 + `sslmode=require` 적용 → 동시접속 효율↑
2) Kakao 앱 등록 → Redirect URI를 이후 배포 도메인 기준으로 설정
3) GitHub Secrets 등록(Repo Settings → Secrets and variables → Actions)
   - OIDC 권장: `AWS_ROLE_TO_ASSUME`, `AWS_REGION` (예: ap-northeast-2)
   - (대안) 액세스 키: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
   - `LIGHTSAIL_SERVICE_NAME` (예: pet-server) — 영어 소문자/하이픈 권장
   - `DATABASE_URL` (Supabase conn string)
   - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
   - `JWT_ACCESS_EXPIRES_IN`(선택, 기본 15m), `JWT_REFRESH_EXPIRES_IN`(선택, 기본 14d)
   - `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`, `KAKAO_REDIRECT_URI`

Lightsail 설정 (최초 1회)
1) Lightsail Console → Containers → Create container service
   - Service name: Secrets의 `LIGHTSAIL_SERVICE_NAME`와 일치
   - Power/scale: 최소(예: Nano/1). 트래픽에 따라 조정 가능
   - Public endpoint: HTTP(기본). 이후 도메인 연결 시 HTTPS 자동 발급 가능
   - 빈 서비스로 생성 후, GitHub Actions가 배포를 올립니다.

자동 배포(권장)
- 리포지토리에 `.github/workflows/deploy-lightsail.yml` 포함됨
- main 브랜치 푸시 또는 수동 실행(workflow_dispatch) 시:
  1. Docker 이미지 빌드
  2. Lightsail 레지스트리로 이미지 푸시
  3. 컨테이너 서비스에 배포 생성(환경변수 포함)
  4. 서비스명이 대문자로 입력되어도 워크플로에서 소문자로 정규화됨

GitHub OIDC 설정(권장)
1) IAM → 역할 생성 → 신뢰 정책에 GitHub OIDC 제공자 추가
   - 공급자: `token.actions.githubusercontent.com`
   - 조건(예시): `aud` = `sts.amazonaws.com`, `sub` = `repo:<ORG>/<REPO>:ref:refs/heads/main`
2) 권한 정책: `AmazonLightsailFullAccess` 최소 필요(운영 시 권한 축소 권장)
3) 생성된 역할 ARN을 GitHub Secret `AWS_ROLE_TO_ASSUME`에 저장

수동 배포(대안)
- 로컬에서 AWS CLI 로그인 후:
  ```bash
  docker build -t pet-server:latest .
  aws lightsail push-container-image --service-name <SERVICE> --label pet-server --image pet-server:latest
  # 출력된 image URI로 containers.json과 endpoint.json 작성 후
  aws lightsail create-container-service-deployment \
    --service-name <SERVICE> \
    --containers file://containers.json \
    --public-endpoint file://endpoint.json
  ```

도메인/HTTPS
1) Lightsail → Networking → Attach a custom domain → A 레코드로 연결
2) Certificate 생성 → 자동 TLS
3) Kakao Redirect URI를 실제 도메인에 맞춰 업데이트

런타임 체크
- 헬스: GET `/` → 200 OK
- 문서: GET `/docs`
- 마이그레이션: 컨테이너 시작 시 `prisma migrate deploy` 자동 실행

비용 참고(대략)
- Lightsail Containers Nano 1스케일: 약 $7/월 수준(지역별 상이)
- Supabase Free: 시작은 무료, 사용량 증가 시 유료 전환

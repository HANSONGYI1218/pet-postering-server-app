import type { PrismaService } from '../prisma/prisma.service';
import { PublicNoticeService } from './public-notice.service';

describe('PublicNoticeService', () => {
  const build = () => {
    const prisma = {
      notice: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    const service = new PublicNoticeService(prisma as unknown as PrismaService);
    return { service, prisma };
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-10-01T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('lists notices ordered with fixed first and counts attachments', async () => {
    const { service, prisma } = build();
    prisma.notice.findMany.mockResolvedValueOnce([
      {
        id: 'notice-1',
        title: '점검 안내',
        type: 'MAINTENANCE',
        isFixed: true,
        createdAt: new Date('2024-09-30T12:00:00.000Z'),
        attachments: [
          { id: 'attachment-1', url: 'https://cdn/file-1.pdf' },
          { id: 'attachment-2', url: 'https://cdn/file-2.pdf' },
        ],
      },
    ]);

    const result = await service.list();

    expect(prisma.notice.findMany).toHaveBeenCalledWith({
      include: { attachments: true },
      orderBy: [{ isFixed: 'desc' }, { createdAt: 'desc' }],
    });
    expect(result).toEqual({
      items: [
        {
          id: 'notice-1',
          title: '점검 안내',
          type: 'MAINTENANCE',
          isFixed: true,
          createdAt: new Date('2024-09-30T12:00:00.000Z'),
          attachments: 2,
        },
      ],
    });
  });

  it('returns detail with attachment urls and throws when not found', async () => {
    const { service, prisma } = build();
    prisma.notice.findUnique.mockResolvedValueOnce(null);

    await expect(service.get('missing')).rejects.toThrow('public-notice-not-found');

    prisma.notice.findUnique.mockResolvedValueOnce({
      id: 'notice-1',
      title: '점검 안내',
      type: 'MAINTENANCE',
      isFixed: true,
      createdAt: new Date('2024-09-30T12:00:00.000Z'),
      content: '10월 2일 02:00~04:00 서버 점검',
      attachments: [
        { id: 'attachment-1', url: 'https://cdn/file-1.pdf' },
        { id: 'attachment-2', url: 'https://cdn/file-2.pdf' },
      ],
    });

    await expect(service.get('notice-1')).resolves.toEqual({
      id: 'notice-1',
      title: '점검 안내',
      type: 'MAINTENANCE',
      isFixed: true,
      createdAt: new Date('2024-09-30T12:00:00.000Z'),
      content: '10월 2일 02:00~04:00 서버 점검',
      attachmentFiles: ['https://cdn/file-1.pdf', 'https://cdn/file-2.pdf'],
    });
  });
});

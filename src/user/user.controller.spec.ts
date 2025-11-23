import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test } from '@nestjs/testing';

import type { AuthUser } from '../common/types';
import { FosterConditionService } from './foster-condition.service';
import { UsersController } from './user.controller';
import { UsersService } from './user.service';

describe('UsersController', () => {
  const authUser: AuthUser = { userId: 'user-1', role: 'USER' };
  let controller: UsersController;
  let service: jest.Mocked<UsersService>;
  let fosterConditionService: jest.Mocked<FosterConditionService>;

  beforeEach(async () => {
    service = {
      getProfile: jest.fn(),
      getNotificationSetting: jest.fn(),
      updateProfile: jest.fn(),
      updateNotificationSetting: jest.fn(),
      deleteAccount: jest.fn(),
      listMyPosts: jest.fn(),
      listMyComments: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    fosterConditionService = {
      getMyCondition: jest.fn(),
      upsertMyCondition: jest.fn(),
      deleteMyCondition: jest.fn(),
    } as unknown as jest.Mocked<FosterConditionService>;

    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: service },
        { provide: FosterConditionService, useValue: fosterConditionService },
      ],
    }).compile();

    controller = moduleRef.get(UsersController);
  });

  it('GET /users/me/profile', async () => {
    const expected = { id: 'user-1', name: 'Alex Kim' } as any;
    service.getProfile.mockResolvedValueOnce(expected);

    await expect(controller.getProfile(authUser)).resolves.toBe(expected);
    expect(service.getProfile).toHaveBeenCalledWith('user-1');
  });

  it('GET /users/me/notification-settings', async () => {
    const expected = { commentEmail: true } as any;
    service.getNotificationSetting.mockResolvedValueOnce(expected);

    await expect(controller.getNotificationSetting(authUser)).resolves.toBe(expected);
    expect(service.getNotificationSetting).toHaveBeenCalledWith('user-1');
  });

  it('PATCH /users/me/profile', async () => {
    const payload = { name: 'Alex Kim' } as any;
    service.updateProfile.mockResolvedValueOnce(payload);

    await expect(controller.updateProfile(authUser, payload)).resolves.toBe(payload);
    expect(service.updateProfile).toHaveBeenCalledWith('user-1', payload);
  });

  it('PATCH /users/me/notification-settings', async () => {
    const payload = { commentEmail: false } as any;
    service.updateNotificationSetting.mockResolvedValueOnce(payload);

    await expect(controller.updateNotificationSetting(authUser, payload)).resolves.toBe(
      payload,
    );
    expect(service.updateNotificationSetting).toHaveBeenCalledWith('user-1', payload);
  });

  it('DELETE /users/me', async () => {
    service.deleteAccount.mockResolvedValueOnce(undefined as any);

    await expect(controller.deleteAccount(authUser)).resolves.toBeUndefined();
    expect(service.deleteAccount).toHaveBeenCalledWith('user-1');
  });

  it('GET /users/me/posts', async () => {
    const expected = [{ id: 'post-1' }] as any;
    service.listMyPosts.mockResolvedValueOnce(expected);

    await expect(controller.listMyPosts(authUser)).resolves.toBe(expected);
    expect(service.listMyPosts).toHaveBeenCalledWith('user-1');
  });

  it('GET /users/me/comments', async () => {
    const expected = [{ id: 'comment-1' }] as any;
    service.listMyComments.mockResolvedValueOnce(expected);

    await expect(controller.listMyComments(authUser)).resolves.toBe(expected);
    expect(service.listMyComments).toHaveBeenCalledWith('user-1');
  });

  it('GET /users/me/foster-condition', async () => {
    const expected = { id: 'fc-1' } as any;
    fosterConditionService.getMyCondition.mockResolvedValueOnce(expected);

    await expect(controller.getFosterCondition(authUser)).resolves.toBe(expected);
    expect(fosterConditionService.getMyCondition).toHaveBeenCalledWith('user-1');
  });

  it('PUT /users/me/foster-condition', async () => {
    const payload = { preferredTypes: ['DOG'] } as any;
    fosterConditionService.upsertMyCondition.mockResolvedValueOnce(payload);

    await expect(controller.upsertFosterCondition(authUser, payload)).resolves.toBe(
      payload,
    );
    expect(fosterConditionService.upsertMyCondition).toHaveBeenCalledWith(
      'user-1',
      payload,
    );
  });

  it('DELETE /users/me/foster-condition', async () => {
    fosterConditionService.deleteMyCondition.mockResolvedValueOnce(undefined as any);

    await expect(controller.deleteFosterCondition(authUser)).resolves.toBeUndefined();
    expect(fosterConditionService.deleteMyCondition).toHaveBeenCalledWith('user-1');
  });
});

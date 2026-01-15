import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp, generateTestToken, parseBody } from '../../setup/app.js';
import { createTestUser, createTestShot, cleanupTestData } from '../../setup/fixtures.js';

describe('Admin Routes', () => {
  let app: FastifyInstance;
  let adminUser: { id: string; username: string };
  let regularUser: { id: string; username: string };
  let adminToken: string;
  let regularToken: string;

  beforeAll(async () => {
    app = await buildTestApp({ withRoutes: true });
    await app.ready();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  beforeEach(async () => {
    await cleanupTestData();

    // Create admin user
    adminUser = await createTestUser({
      username: 'admin_user',
      displayName: 'Admin User',
      isAdmin: true,
    });

    // Create regular user
    regularUser = await createTestUser({
      username: 'regular_user',
      displayName: 'Regular User',
      isAdmin: false,
    });

    adminToken = generateTestToken(app, {
      userId: adminUser.id,
      username: adminUser.username,
    });

    regularToken = generateTestToken(app, {
      userId: regularUser.id,
      username: regularUser.username,
    });
  });

  describe('GET /admin/stats', () => {
    it('should return dashboard stats for admin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/stats',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = parseBody<{
        totalUsers: number;
        activeToday: number;
        totalShots: number;
        pendingReports: number;
      }>(response);
      expect(body).toHaveProperty('totalUsers');
      expect(body).toHaveProperty('activeToday');
      expect(body).toHaveProperty('totalShots');
      expect(body).toHaveProperty('pendingReports');
    });

    it('should reject non-admin users', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/stats',
        headers: {
          Authorization: `Bearer ${regularToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = parseBody<{ error: string }>(response);
      expect(body.error).toBe('Admin access required');
    });

    it('should reject unauthenticated requests', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/stats',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /admin/users', () => {
    it('should list users for admin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/users',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = parseBody<{
        users: Array<{ id: string; username: string }>;
        hasMore: boolean;
      }>(response);
      expect(body).toHaveProperty('users');
      expect(Array.isArray(body.users)).toBe(true);
      expect(body.users.length).toBeGreaterThanOrEqual(2); // At least admin and regular user
    });

    it('should filter by search query', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/users?search=admin',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = parseBody<{
        users: Array<{ id: string; username: string }>;
      }>(response);
      expect(body.users.some((u) => u.username.includes('admin'))).toBe(true);
    });

    it('should reject non-admin users', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/users',
        headers: {
          Authorization: `Bearer ${regularToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('GET /admin/users/:id', () => {
    it('should get user detail for admin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/admin/users/${regularUser.id}`,
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = parseBody<{
        id: string;
        username: string;
        isAdmin: boolean;
      }>(response);
      expect(body.id).toBe(regularUser.id);
      expect(body.username).toBe(regularUser.username);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/users/00000000-0000-0000-0000-000000000000',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /admin/users/:id', () => {
    it('should toggle admin status', async () => {
      // Make regular user an admin
      const response = await app.inject({
        method: 'PATCH',
        url: `/admin/users/${regularUser.id}`,
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
        payload: { isAdmin: true },
      });

      expect(response.statusCode).toBe(200);
      const body = parseBody<{ user: { isAdmin: boolean } }>(response);
      expect(body.user.isAdmin).toBe(true);
    });
  });

  describe('POST /admin/users/:id/ban', () => {
    it('should ban a user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/admin/users/${regularUser.id}/ban`,
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
        payload: { reason: 'Test ban reason' },
      });

      expect(response.statusCode).toBe(200);
      const body = parseBody<{ success: boolean }>(response);
      expect(body.success).toBe(true);
    });
  });

  describe('POST /admin/users/:id/revoke', () => {
    it('should revoke user sessions', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/admin/users/${regularUser.id}/revoke`,
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = parseBody<{ success: boolean }>(response);
      expect(body.success).toBe(true);
    });
  });

  describe('GET /admin/shots', () => {
    beforeEach(async () => {
      // Create a test shot
      await createTestShot({
        userId: regularUser.id,
        prompt: 'Test shot',
        imageUrl: 'https://example.com/test.jpg',
      });
    });

    it('should list shots for admin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/shots',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = parseBody<{
        shots: Array<{ id: string; prompt: string }>;
        hasMore: boolean;
      }>(response);
      expect(body).toHaveProperty('shots');
      expect(Array.isArray(body.shots)).toBe(true);
    });

    it('should filter by userId', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/admin/shots?userId=${regularUser.id}`,
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = parseBody<{
        shots: Array<{ userId: string }>;
      }>(response);
      expect(body.shots.every((s) => s.userId === regularUser.id)).toBe(true);
    });
  });

  describe('GET /admin/analytics', () => {
    it('should return analytics data', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/analytics',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = parseBody<{
        userGrowth: unknown[];
        contentStats: unknown[];
        engagement: { dau: number; wau: number; mau: number };
        topCreators: unknown[];
      }>(response);
      expect(body).toHaveProperty('userGrowth');
      expect(body).toHaveProperty('contentStats');
      expect(body).toHaveProperty('engagement');
      expect(body).toHaveProperty('topCreators');
    });
  });

  describe('Admin Access Control', () => {
    it('should reject all admin endpoints for non-admin users', async () => {
      const endpoints = [
        { method: 'GET' as const, url: '/admin/stats' },
        { method: 'GET' as const, url: '/admin/users' },
        { method: 'GET' as const, url: '/admin/shots' },
        { method: 'GET' as const, url: '/admin/comments' },
        { method: 'GET' as const, url: '/admin/tags' },
        { method: 'GET' as const, url: '/admin/analytics' },
        { method: 'GET' as const, url: '/admin/audit-log' },
      ];

      for (const endpoint of endpoints) {
        const response = await app.inject({
          method: endpoint.method,
          url: endpoint.url,
          headers: {
            Authorization: `Bearer ${regularToken}`,
          },
        });

        expect(response.statusCode).toBe(403);
      }
    });
  });
});

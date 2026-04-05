import { request, createTestUser, cleanupUser, authHeader, TestUser } from '../helpers';

const TEST_EMAIL = 'sync-test@example.com';
let user: TestUser;
let taskId: string;

beforeEach(async () => {
  user = await createTestUser(TEST_EMAIL);

  // Create a task to sync
  const res = await request
    .post('/api/tasks')
    .set(authHeader(user.accessToken))
    .send({ title: 'Sync Test Task', priority: 'MEDIUM', status: 'TODO' });

  taskId = res.body.data.id;
});

afterEach(async () => {
  await cleanupUser(TEST_EMAIL);
});

// ─────────────────────────────────────────────
// Sync single task
// ─────────────────────────────────────────────
describe('POST /api/sync/tasks/:id', () => {
  it('should sync task with no conflict', async () => {
    const res = await request
      .post(`/api/sync/tasks/${taskId}`)
      .set(authHeader(user.accessToken))
      .send({
        title:       'Updated Title',
        status:      'IN_PROGRESS',
        priority:    'HIGH',
        baseVersion: 1,
        updatedAt:   new Date().toISOString(),
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('SYNCED');
    expect(res.body.data.finalTask.version).toBe(2);
    expect(res.body.data.finalTask.title).toBe('Updated Title');
  });

  it('should resolve conflict with CLIENT_WINS when client is newer', async () => {
    // First sync to bump version to 2
    await request
      .post(`/api/sync/tasks/${taskId}`)
      .set(authHeader(user.accessToken))
      .send({
        title:       'First sync',
        status:      'TODO',
        priority:    'MEDIUM',
        baseVersion: 1,
        updatedAt:   new Date('2026-01-01').toISOString(),
      });

    // Second sync with old baseVersion but newer timestamp
    const res = await request
      .post(`/api/sync/tasks/${taskId}`)
      .set(authHeader(user.accessToken))
      .send({
        title:       'Client wins',
        status:      'IN_PROGRESS',
        priority:    'HIGH',
        baseVersion: 1,
        updatedAt:   new Date().toISOString(), // newer than server
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('RESOLVED');
    expect(res.body.data.strategy).toBe('CLIENT_WINS');
    expect(res.body.data.finalTask.title).toBe('Client wins');
    expect(res.body.data.conflictInfo).toBeDefined();
  });

  it('should resolve conflict with SERVER_WINS when server is newer', async () => {
    // First sync to bump version to 2
    await request
      .post(`/api/sync/tasks/${taskId}`)
      .set(authHeader(user.accessToken))
      .send({
        title:       'Server version',
        status:      'IN_PROGRESS',
        priority:    'HIGH',
        baseVersion: 1,
        updatedAt:   new Date().toISOString(),
      });

    // Second sync with old baseVersion and old timestamp
    const res = await request
      .post(`/api/sync/tasks/${taskId}`)
      .set(authHeader(user.accessToken))
      .send({
        title:       'Client old version',
        status:      'TODO',
        priority:    'LOW',
        baseVersion: 1,
        updatedAt:   new Date('2026-01-01').toISOString(), // older than server
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('RESOLVED');
    expect(res.body.data.strategy).toBe('SERVER_WINS');
    expect(res.body.data.finalTask.title).toBe('Server version');
  });

  it('should never overwrite DONE status', async () => {
    // Set task to DONE first
    await request
      .post(`/api/sync/tasks/${taskId}`)
      .set(authHeader(user.accessToken))
      .send({
        title:       'Done task',
        status:      'DONE',
        priority:    'MEDIUM',
        baseVersion: 1,
        updatedAt:   new Date().toISOString(),
      });

    // Try to overwrite with old baseVersion
    const res = await request
      .post(`/api/sync/tasks/${taskId}`)
      .set(authHeader(user.accessToken))
      .send({
        title:       'Try to reopen',
        status:      'TODO',
        priority:    'LOW',
        baseVersion: 1,
        updatedAt:   new Date().toISOString(),
      });

    expect(res.status).toBe(200);
    expect(res.body.data.strategy).toBe('SERVER_WINS');
    expect(res.body.data.finalTask.status).toBe('DONE');
  });

  it('should return 401 without auth', async () => {
    const res = await request
      .post(`/api/sync/tasks/${taskId}`)
      .send({
        title:       'No auth',
        status:      'TODO',
        priority:    'LOW',
        baseVersion: 1,
        updatedAt:   new Date().toISOString(),
      });

    expect(res.status).toBe(401);
  });

  it('should return 422 without baseVersion', async () => {
    const res = await request
      .post(`/api/sync/tasks/${taskId}`)
      .set(authHeader(user.accessToken))
      .send({
        title:    'No version',
        status:   'TODO',
        priority: 'LOW',
        updatedAt: new Date().toISOString(),
      });

    expect(res.status).toBe(422);
  });
});

// ─────────────────────────────────────────────
// Batch sync
// ─────────────────────────────────────────────
describe('POST /api/sync/tasks (batch)', () => {
  it('should sync multiple tasks', async () => {
    // Create second task
    const res2 = await request
      .post('/api/tasks')
      .set(authHeader(user.accessToken))
      .send({ title: 'Task 2', priority: 'LOW', status: 'TODO' });

    const taskId2 = res2.body.data.id;

    const res = await request
      .post('/api/sync/tasks')
      .set(authHeader(user.accessToken))
      .send({
        tasks: [
          {
            id:          taskId,
            title:       'Batch Task 1',
            status:      'IN_PROGRESS',
            priority:    'HIGH',
            baseVersion: 1,
            updatedAt:   new Date().toISOString(),
          },
          {
            id:          taskId2,
            title:       'Batch Task 2',
            status:      'DONE',
            priority:    'LOW',
            baseVersion: 1,
            updatedAt:   new Date().toISOString(),
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data[0].status).toBe('SYNCED');
    expect(res.body.data[1].status).toBe('SYNCED');
  });

  it('should return 422 for empty tasks array', async () => {
    const res = await request
      .post('/api/sync/tasks')
      .set(authHeader(user.accessToken))
      .send({ tasks: [] });

    expect(res.status).toBe(422);
  });
});

// ─────────────────────────────────────────────
// Pull sync
// ─────────────────────────────────────────────
describe('GET /api/sync/tasks', () => {
  it('should return tasks modified since timestamp', async () => {
    const since = new Date('2026-01-01').toISOString();

    const res = await request
      .get(`/api/sync/tasks?since=${since}`)
      .set(authHeader(user.accessToken));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('should return empty if no tasks modified since timestamp', async () => {
    const since = new Date('2030-01-01').toISOString();

    const res = await request
      .get(`/api/sync/tasks?since=${since}`)
      .set(authHeader(user.accessToken));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0);
  });

  it('should return 422 without since param', async () => {
    const res = await request
      .get('/api/sync/tasks')
      .set(authHeader(user.accessToken));

    expect(res.status).toBe(422);
  });
});
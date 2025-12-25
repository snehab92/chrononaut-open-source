/**
 * TickTick Direct Auth Client
 * 
 * Based on TickTickSync (15k+ users) implementation.
 * Uses direct username/password login instead of OAuth.
 * 
 * SAFETY: This client enforces read-heavy, write-minimal operations.
 * Only allowed writes: complete/skip task, change due date
 */

// Types
export interface TickTickProject {
  id: string;
  name: string;
  color?: string;
  sortOrder: number;
  viewMode?: string;
  kind?: string;
  closed?: boolean;
}

export interface TickTickSection {
  id: string;
  projectId: string;
  name: string;
  sortOrder: number;
}

export interface TickTickTask {
  id: string;
  projectId: string;
  title: string;
  content?: string;
  desc?: string;
  priority: number; // 0=none, 1=low, 3=medium, 5=high
  status: number; // 0=active, 2=completed
  dueDate?: string;
  startDate?: string;
  isAllDay?: boolean;
  timeZone?: string;
  reminders?: string[];
  tags?: string[];
  sortOrder: number;
  items?: TickTickChecklistItem[]; // Subtasks/checklist
  parentId?: string; // For subtasks
  columnId?: string; // Section ID
  modifiedTime?: string; // ISO timestamp of last modification
}

export interface TickTickChecklistItem {
  id: string;
  title: string;
  status: number;
  sortOrder: number;
}

export interface LoginResponse {
  token: string;
  inboxId: string;
  userId?: string;
}

// Generate x-device header (required by TickTick)
function generateXDevice(): string {
  // Generate a random 24-char hex ID starting with '66'
  const prefix = '66';
  const characters = '0123456789abcdef';
  let id = prefix;
  for (let i = 0; i < 22; i++) {
    id += characters[Math.floor(Math.random() * characters.length)];
  }

  const xDevice = {
    platform: 'web',
    os: 'Windows 10',
    device: 'Firefox 117.0',
    name: '',
    version: 6070, // Must be >= 6070
    id: id,
    channel: 'website',
    campaign: '',
    websocket: ''
  };

  return JSON.stringify(xDevice);
}

export class TickTickClient {
  private token: string;
  private inboxId: string;
  private xDevice: string;
  private cookies: string = '';
  
  private readonly apiUrl = 'https://api.ticktick.com/api/v2';
  private readonly loginUrl = 'https://ticktick.com/api/v2';

  constructor(token: string, inboxId: string, xDevice?: string) {
    this.token = token;
    this.inboxId = inboxId;
    this.xDevice = xDevice || generateXDevice();
  }

  /**
   * Login with username/password to get session token
   */
  static async login(username: string, password: string): Promise<{ client: TickTickClient; token: string; inboxId: string }> {
    const xDevice = generateXDevice();
    
    const response = await fetch('https://ticktick.com/api/v2/user/signon?wc=true&remember=true', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'x-device': xDevice,
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Login failed:', response.status, errorText);
      throw new Error(`Login failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.token) {
      throw new Error('Login response missing token');
    }

    const client = new TickTickClient(data.token, data.inboxId, xDevice);
    
    return {
      client,
      token: data.token,
      inboxId: data.inboxId
    };
  }

  /**
   * Create client from stored token
   */
  static fromToken(token: string, inboxId: string): TickTickClient {
    return new TickTickClient(token, inboxId);
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:117.0) Gecko/20100101 Firefox/117.0',
      'x-device': this.xDevice,
      'Cookie': `t=${this.token};${this.cookies}`,
      't': this.token
    };
  }

  private async request<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`;
    
    const response = await fetch(url, {
      method,
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`TickTick API error: ${method} ${endpoint}`, response.status, errorText);
      throw new Error(`TickTick API error: ${response.status}`);
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) return {} as T;
    
    return JSON.parse(text);
  }

  // ==================== READ OPERATIONS (All allowed) ====================

  /**
   * Get all projects
   */
  async getProjects(): Promise<TickTickProject[]> {
    return this.request<TickTickProject[]>('GET', '/projects');
  }

  /**
   * Get all tasks (batch endpoint returns everything)
   */
  async getAllTasks(): Promise<{
    projectProfiles: TickTickProject[];
    syncTaskBean: {
      update: TickTickTask[];
    };
    tags: { name: string; label: string; sortOrder: number }[];
  }> {
    // The batch/check endpoint returns all data
    return this.request('GET', '/batch/check/0');
  }

  /**
   * Get sections for a project
   */
  async getSections(projectId: string): Promise<TickTickSection[]> {
    const data = await this.request<{ columns: TickTickSection[] }>('GET', `/project/${projectId}/data`);
    return data.columns || [];
  }

  /**
   * Get full project data including tasks with columnId
   */
  async getProjectData(projectId: string): Promise<{
    tasks: TickTickTask[];
    columns: TickTickSection[];
  }> {
    const data = await this.request<{
      tasks: TickTickTask[];
      columns: TickTickSection[];
    }>('GET', `/project/${projectId}/data`);
    return {
      tasks: data.tasks || [],
      columns: data.columns || [],
    };
  }

  /**
   * Get a single task
   */
  async getTask(projectId: string, taskId: string): Promise<TickTickTask> {
    return this.request<TickTickTask>('GET', `/project/${projectId}/task/${taskId}`);
  }

  /**
   * Check if token is still valid
   */
  async validateToken(): Promise<boolean> {
    try {
      await this.request('GET', '/user/status');
      return true;
    } catch {
      return false;
    }
  }

  // ==================== WRITE OPERATIONS (Strictly limited) ====================

  /**
   * Complete a task
   * ALLOWED: Yes - this is a safe, reversible action
   * 
   * Uses batch/task endpoint with status: 2 (completed)
   */
  async completeTask(projectId: string, taskId: string): Promise<void> {
    const payload = {
      add: [],
      addAttachments: [],
      delete: [],
      deleteAttachments: [],
      updateAttachments: [],
      update: [{
        id: taskId,
        projectId: projectId,
        status: 2, // 2 = completed
        modifiedTime: new Date().toISOString().replace('Z', '+0000')
      }]
    };
    
    await this.request('POST', '/batch/task', payload);
  }

  /**
   * Update task due date ONLY
   * ALLOWED: Yes - this is a safe, reversible action
   * 
   * Uses batch/task endpoint - same as completeTask
   * 
   * @param taskId - The task ID
   * @param projectId - The project ID
   * @param dueDate - ISO date string (e.g., "2024-12-15T09:00:00.000+0000") or null to clear
   * @param isAllDay - Whether it's an all-day task
   */
  async updateTaskDueDate(
    taskId: string, 
    projectId: string, 
    dueDate: string | null,
    isAllDay: boolean = true
  ): Promise<unknown> {
    const payload = {
      add: [],
      addAttachments: [],
      delete: [],
      deleteAttachments: [],
      updateAttachments: [],
      update: [{
        id: taskId,
        projectId: projectId,
        dueDate: dueDate || null,
        isAllDay: isAllDay,
        modifiedTime: new Date().toISOString().replace('Z', '+0000')
      }]
    };
    
    console.log('TickTick batch/task payload:', JSON.stringify(payload, null, 2));
    
    const result = await this.request('POST', '/batch/task', payload);
    
    console.log('TickTick batch/task result:', JSON.stringify(result, null, 2));
    
    return result;
  }

  /**
   * Create a new task
   * ALLOWED: Yes - this is needed for quick task creation
   *
   * Uses batch/task endpoint with add array
   *
   * @param task - The task data
   * @returns The created task ID
   */
  async createTask(task: {
    title: string;
    content?: string;
    projectId?: string; // Defaults to inbox
    dueDate?: string | null;
    priority?: number; // 0=none, 1=low, 3=medium, 5=high
    isAllDay?: boolean;
  }): Promise<{ id: string; projectId: string }> {
    // Generate a unique ID for the new task
    const taskId = this.generateTaskId();
    const projectId = task.projectId || this.inboxId;

    const newTask = {
      id: taskId,
      projectId: projectId,
      title: task.title,
      content: task.content || '',
      priority: task.priority || 0,
      status: 0, // 0 = active
      dueDate: task.dueDate || null,
      isAllDay: task.isAllDay ?? true,
      sortOrder: -Date.now(), // Negative timestamp for newest first
      modifiedTime: new Date().toISOString().replace('Z', '+0000'),
      createdTime: new Date().toISOString().replace('Z', '+0000'),
    };

    const payload = {
      add: [newTask],
      addAttachments: [],
      delete: [],
      deleteAttachments: [],
      updateAttachments: [],
      update: []
    };

    await this.request('POST', '/batch/task', payload);

    return { id: taskId, projectId };
  }

  /**
   * Generate a unique task ID in TickTick format
   * Format: 24-character hex string
   */
  private generateTaskId(): string {
    const characters = '0123456789abcdef';
    let id = '';
    for (let i = 0; i < 24; i++) {
      id += characters[Math.floor(Math.random() * characters.length)];
    }
    return id;
  }

  // ==================== BLOCKED OPERATIONS ====================
  // These methods are intentionally NOT implemented to prevent accidental data modification

  // deleteTask - NOT IMPLEMENTED
  // updateTaskTitle - NOT IMPLEMENTED
  // updateTaskContent - NOT IMPLEMENTED
  // createProject - NOT IMPLEMENTED
  // deleteProject - NOT IMPLEMENTED
  // createSection - NOT IMPLEMENTED
  // deleteSection - NOT IMPLEMENTED
  // moveTask - NOT IMPLEMENTED
}

// Export helper to format dates for TickTick
export function formatTickTickDate(date: Date, isAllDay: boolean = false): string {
  if (isAllDay) {
    // All-day tasks use date only
    return date.toISOString().split('T')[0] + 'T00:00:00.000+0000';
  }
  // Tasks with time
  return date.toISOString().replace('Z', '+0000');
}

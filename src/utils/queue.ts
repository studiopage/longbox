import fs from 'fs';
import path from 'path';

// Define where the queue lives. 
// DOCKER NOTE: Ensure '/app/config' is mapped to a volume!
const QUEUE_FILE = path.join(process.cwd(), 'config', 'import_queue.json');

export interface QueueItem {
  id: string; // uuid
  filePath: string;
  localTitle: string;
  localYear: string | null;
  remoteId: string;
  remoteTitle: string;
  remoteYear: string | null;
  score: number;
  status: 'pending' | 'skipped';
  timestamp: number;
}

export class QueueManager {
  private items: QueueItem[] = [];

  constructor() {
    this.ensureDir();
    this.load();
  }

  private ensureDir() {
    const dir = path.dirname(QUEUE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private load() {
    if (fs.existsSync(QUEUE_FILE)) {
      try {
        const raw = fs.readFileSync(QUEUE_FILE, 'utf-8');
        this.items = JSON.parse(raw);
      } catch (e) {
        console.error('⚠️ Failed to load queue file, initializing empty.');
        this.items = [];
      }
    }
  }

  public save() {
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(this.items, null, 2));
  }

  public add(item: QueueItem) {
    // Prevent duplicates: If file path exists, update it.
    const existingIndex = this.items.findIndex(i => i.filePath === item.filePath);
    if (existingIndex > -1) {
      this.items[existingIndex] = { ...item, timestamp: Date.now() }; 
    } else {
      this.items.push({ ...item, timestamp: Date.now() });
    }
    this.save();
  }

  public getPending() {
    return this.items
      .filter(i => i.status === 'pending')
      .sort((a, b) => b.score - a.score); // Highest score first
  }

  public remove(id: string) {
    this.items = this.items.filter(i => i.id !== id);
    this.save();
  }
  
  public getById(id: string): QueueItem | undefined {
      return this.items.find(i => i.id === id);
  }
}


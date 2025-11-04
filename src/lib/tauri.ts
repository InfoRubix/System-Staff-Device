// Tauri API utilities for device monitoring
import { invoke } from '@tauri-apps/api/core';

export interface SystemInfo {
  cpu_usage: number;
  memory_total: number;
  memory_used: number;
  memory_available: number;
  disk_info: DiskInfo[];
  network_info: Record<string, NetworkInfo>;
  os_name: string;
  os_version: string;
  cpu_name: string;
  cpu_cores: number;
}

export interface DiskInfo {
  name: string;
  mount_point: string;
  total_space: number;
  available_space: number;
  used_space: number;
}

export interface NetworkInfo {
  received: number;
  transmitted: number;
}

/**
 * Get comprehensive system information
 */
export async function getSystemInfo(): Promise<SystemInfo> {
  try {
    const info = await invoke<SystemInfo>('get_system_info');
    return info;
  } catch (error) {
    console.error('Failed to get system info:', error);
    throw error;
  }
}

/**
 * Get current CPU usage percentage
 */
export async function getCpuUsage(): Promise<number> {
  try {
    const usage = await invoke<number>('get_cpu_usage');
    return usage;
  } catch (error) {
    console.error('Failed to get CPU usage:', error);
    throw error;
  }
}

/**
 * Get memory usage (used, total) in bytes
 */
export async function getMemoryUsage(): Promise<[number, number]> {
  try {
    const usage = await invoke<[number, number]>('get_memory_usage');
    return usage;
  } catch (error) {
    console.error('Failed to get memory usage:', error);
    throw error;
  }
}

/**
 * Check if running in Tauri environment
 */
export function isTauriApp(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

/**
 * Format bytes to human-readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format percentage with 2 decimal places
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}

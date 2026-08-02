import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';

const CHECK_INTERVAL_MS = 30_000;
const FAILURE_THRESHOLD = 3;

export function useHealthCheck() {
  const [isHealthy, setIsHealthy] = useState(true);

  const check = useCallback(async () => {
    try {
      await apiClient.get('/health');
      setIsHealthy(true);
    } catch {
      setIsHealthy(prev => {
        if (prev === false) return false;
        return prev;
      });
    }
  }, []);

  useEffect(() => {
    let failures = 0;
    const timer = setInterval(async () => {
      try {
        await apiClient.get('/health');
        setIsHealthy(true);
        failures = 0;
      } catch {
        failures++;
        if (failures >= FAILURE_THRESHOLD) {
          setIsHealthy(false);
        }
      }
    }, CHECK_INTERVAL_MS);
    check();
    return () => clearInterval(timer);
  }, [check]);

  return { isHealthy, retry: check };
}

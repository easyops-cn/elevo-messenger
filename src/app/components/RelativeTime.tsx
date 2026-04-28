import { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';

interface RelativeTimeProps {
  ts: number;
};

export function RelativeTime({ ts }: RelativeTimeProps) {
  const formatRelativeTime = useCallback(() => dayjs(ts).fromNow(), [ts]);

  const [relativeTime, setRelativeTime] = useState<string>(formatRelativeTime);

  useEffect(() => {
    const interval = setInterval(() => {
      setRelativeTime(formatRelativeTime());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [formatRelativeTime]);

  return relativeTime;
}

// Convenience selector hook for topic state and actions.

import { useAppStore } from '../store/useAppStore';

export function useTopics() {
  const topics = useAppStore((s) => s.topics);
  const currentTopicPath = useAppStore((s) => s.currentTopicPath);
  const createTopic = useAppStore((s) => s.createTopic);
  const selectTopic = useAppStore((s) => s.selectTopic);
  const refreshTopics = useAppStore((s) => s.refreshTopics);
  const current = topics.find((t) => t.path === currentTopicPath) ?? null;
  return { topics, current, createTopic, selectTopic, refreshTopics };
}

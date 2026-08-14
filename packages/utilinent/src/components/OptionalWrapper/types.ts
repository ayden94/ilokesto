
export interface OptionalWrapperProps<T = unknown> {
  when: T; 
  children: React.ReactNode; 
  wrapper: (children: React.ReactNode) => React.ReactNode;
  fallback?: (children: React.ReactNode) => React.ReactNode;
}
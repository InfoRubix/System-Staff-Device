'use client';

interface LoadingScreenProps {
  show?: boolean;
}

export default function LoadingScreen({ show = true }: LoadingScreenProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-gray-600" />
        <span className="text-gray-700">Loading</span>
      </div>
    </div>
  );
}
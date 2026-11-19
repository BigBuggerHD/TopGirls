export const mediaUrl = (key: string | null | undefined) => (key ? `/api/media/${key}` : null);

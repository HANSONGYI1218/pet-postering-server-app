export const sortImagesByOrder = <T extends { sortOrder: number | null }>(
  images: readonly T[],
): T[] =>
  images.slice().sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0));

export const sortedImageUrls = (
  images: readonly { sortOrder: number | null; url: string }[],
): string[] => sortImagesByOrder(images).map((image) => image.url);

export const firstImageUrlOrNull = (
  images: readonly { sortOrder: number | null; url: string }[],
): string | null => sortedImageUrls(images).at(0) ?? null;

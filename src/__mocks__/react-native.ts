export const Platform = {
  OS: 'web',
  select: (obj: Record<string, unknown>) => obj.web ?? obj.default,
};

export const NativeModules = {};

export const StyleSheet = {
  create: <T extends Record<string, unknown>>(styles: T): T => styles,
};

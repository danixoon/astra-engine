export const generateId = () => {
  let id = Date.now().toString();
  for (let i = 0; i < 5; i++) id += String.fromCharCode(Number(Math.floor(97 + Math.random() * (122 - 97)).toString()));
  return id;
};

export const mapValueChecker: <T>(
  map: Map<any, T>,
  exceptionCallback: (id: string) => { include: string; exclude: string }
) => (id: string, required?: boolean, predicate?: (v: T) => string) => T = <T>(map, exceptionCallback) => (id, has, predicate) => {
  const value = map.get(id);
  const ex = exceptionCallback(id);
  if (has !== undefined) {
    if (has && value === undefined) throw ex.exclude;
    if (!has && value !== undefined) throw ex.include;

    if (value && predicate) {
      let p = predicate(value);
      if (p) throw p;
    }
  }

  return value as T;
};

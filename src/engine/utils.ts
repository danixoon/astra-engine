export const generateId = () => {
  let id = Date.now().toString();
  for (let i = 0; i < 5; i++) id += String.fromCharCode(Number(Math.floor(97 + Math.random() * (122 - 97)).toString()));
  return id;
};

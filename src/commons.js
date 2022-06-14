const Commons = {
  Functions: {
    uuidv4: (stringFormat = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx') => {
      return stringFormat.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0,
          v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    },
    cloneDeep: (obj) => {
      if (obj === null || typeof obj !== 'object') {
        return obj;
      }

      const result = Array.isArray(obj) ? [] : {};

      for (let key of Object.keys(obj)) {
        result[key] = Commons.Functions.cloneDeep(obj[key]);
      }

      return result;
    },
    getToday: () => {
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yyyy = today.getFullYear();

      return yyyy + mm + dd;
    }
  }
}

export default Commons;
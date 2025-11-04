export const createMockRes = () => {
    const res = {};
    res.status = jestLike((code) => {
      res.statusCode = code;
      return res;
    });
    res.json = jestLike((body) => {
      res.body = body;
      return res;
    });
    return res;
  };
  
  export const createNext = () => {
    const calls = [];
    const next = (err) => calls.push(err || null);
    next.calls = calls;
    return next;
  };
  
  // minimal spy util for plain JS
  function jestLike(fn) {
    const wrapper = (...args) => {
      wrapper.calls.push(args);
      return fn(...args);
    };
    wrapper.calls = [];
    return wrapper;
  }
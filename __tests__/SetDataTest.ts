import { useStore } from "../src";
import { setStoreData } from "../src/SetData";
import { StoreExtractor } from "../src/StoreExtractor";

describe("setdata tests", () => {
  test("setData - Test", () => {
    let store: any = {};

    const map = new Map([["Store.", new StoreExtractor(store, `Store.`)]]);

    setStoreData("Store.a", store, 20, "Store", map, undefined);
    expect(store.a).toBe(20);

    setStoreData("Store.x.y[0]", store, 20, "Store", map, undefined);
    expect(store.x.y[0]).toBe(20);

    setStoreData("Store.z[Store.x.y[0]]", store, 300, "Store", map, undefined);
    expect(store.z[20]).toBe(300);
  });

  test("x.a listener is called when x is called", () => {
    const mockCallback = jest.fn().mockImplementation(() => {});
    const { setData, addListener } = useStore(
      { a: { b: 10, c: ["a", 2, { d: "Hello" }] }, x: { a: 10, b: 20, c: 30 } },
      "Bamboo"
    );
    const unsubscribe = addListener(mockCallback, "Bamboo.x.a");
    setData("Bamboo.x", { a: 10, b: 25, c: 30 });
    expect(mockCallback.mock.calls.length).toBe(1);
    unsubscribe();
  });
  test("x.a has listener and x.b has listener, when x is changed listeners will be called", () => {
    const mockCallback1 = jest.fn().mockImplementation(() => {});
    const mockCallback2 = jest.fn().mockImplementation(() => {});
    const { setData, addListener } = useStore(
      { a: { b: 10, c: ["a", 2, { d: "Hello" }] }, x: { a: 10, b: 20, c: 30 } },
      "Bamboo"
    );
    const unsubscribe1 = addListener(mockCallback1, "Bamboo.x.a");
    const unsubscribe2 = addListener(mockCallback2, "Bamboo.x.b");
    setData("Bamboo.x", { a: 15, b: 35, c: 40 });
    expect(mockCallback1.mock.calls.length).toBe(1);
    expect(mockCallback2.mock.calls.length).toBe(1);
    unsubscribe1();
    unsubscribe2();
  });
  test("x.a and x.b has same listener, when x is changed listeners will be called", () => {
    const mockCallback1 = jest.fn().mockImplementation(() => {});
    const { setData, addListener } = useStore(
      { a: { b: 10, c: ["a", 2, { d: "Hello" }] }, x: { a: 10, b: 20, c: 30 } },
      "Bamboo"
    );
    const unsubscribe1 = addListener(mockCallback1, "Bamboo.x.a", "Bamboo.x.b");
    setData("Bamboo.x", { a: 15, b: 35, c: 40 });
    expect(mockCallback1.mock.calls.length).toBe(1);
    unsubscribe1();
  });

  test("listener when path is undefined", () => {
    const mockCallback1 = jest.fn().mockImplementation(() => {});
    const { setData, addListenerAndCallImmediately } = useStore(
      { a: { b: 10, c: ["a", 2, { d: "Hello" }] }, x: { a: 10, b: 20, c: 30 } },
      "Bamboo"
    );
    const path = undefined;
    const unsubscribe1 = addListenerAndCallImmediately(
      true,
      mockCallback1,
      "Bamboo.x.a",
      path as unknown as string
    );
    setData("Bamboo.x", { a: 15, b: 35, c: 40 });
    expect(mockCallback1.mock.calls.length).toBe(2);
    unsubscribe1();
  });

  test("setData - Delete key", () => {
    let store: any = {};

    const map = new Map([["Store.", new StoreExtractor(store, `Store.`)]]);

    setStoreData("Store.x.y", store, 20, "Store", map, undefined);
    expect(store.x.y).toBe(20);

    setStoreData("Store.x.z", store, "hello", "Store", map, undefined);
    expect(store.x.z).toBe("hello");

    setStoreData("Store.x.h", store, "hello", "Store", map, undefined);
    expect(store.x.h).toBe("hello");

    setStoreData("Store.x.y", store, undefined, "Store", map, true);
    expect(Object.keys(store.x)).toStrictEqual(["z", "h"]);
    setStoreData("Store.x.z", store, "hello world", "Store", map, true);
    expect(Object.keys(store.x)).toStrictEqual(["z", "h"]);
    setStoreData("Store.x.h", store, null, "Store", map, true);
    expect(Object.keys(store.x)).toStrictEqual(["z"]);

    setStoreData("Store.other[0].value", store, 100, "Store", map, undefined);
    expect(store.other[0].value).toBe(100);

    setStoreData("Store.someOther.value", store, undefined, "Store", map, true);
    expect(store.someOther.hasOwnProperty("value")).toBeFalsy();

  });

  test("setData - False value", () => {
    let store: any = {};

    const map = new Map([["Store.", new StoreExtractor(store, `Store.`)]]);

    setStoreData("Store.x.y", store, false, "Store", map, undefined);
    expect(store.x.y).toStrictEqual(false);
  });

  test("setData - in array index when there is nothing", () => {
    let store: any = { arr: [] };

    const map = new Map([["Store.", new StoreExtractor(store, `Store.`)]]);

    setStoreData("Store.arr[2]", store, 100, "Store", map, undefined);
    expect(store.arr.length).toBe(3);
    expect(store.arr[0]).toBeUndefined();
    expect(store.arr[1]).toBeUndefined();
    expect(store.arr[2]).toBe(100);

    console.log(store);
  });
});

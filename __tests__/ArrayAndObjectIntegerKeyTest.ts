import { useStore } from "../src";
import { setStoreData } from "../src/SetData";
import { StoreExtractor } from "../src/StoreExtractor";

describe("Array with integer indexes", () => {
  describe("Basic array index access", () => {
    test("should set and get a value at a specific array index", () => {
      const { setData, getData } = useStore(
        { items: ["a", "b", "c", "d", "e"] },
        "Page"
      );

      expect(getData("Page.items[2]")).toBe("c");
      setData("Page.items[2]", "updated");
      expect(getData("Page.items[2]")).toBe("updated");
    });

    test("should set value at array index 0", () => {
      const { setData, getData } = useStore({ arr: [10, 20, 30] }, "Store");

      setData("Store.arr[0]", 99);
      expect(getData("Store.arr[0]")).toBe(99);
      expect(getData("Store.arr[1]")).toBe(20);
    });

    test("should grow a sparse array when setting beyond current length", () => {
      const { setData, getData } = useStore({ arr: [1, 2] }, "Store");

      setData("Store.arr[5]", 100);
      const arr = getData("Store.arr");
      expect(arr.length).toBe(6);
      expect(arr[5]).toBe(100);
      expect(arr[2]).toBeUndefined();
      expect(arr[3]).toBeUndefined();
      expect(arr[4]).toBeUndefined();
    });

    test("should set value at index on an empty array", () => {
      const { setData, getData } = useStore({ arr: [] as any[] }, "Store");

      setData("Store.arr[0]", "first");
      expect(getData("Store.arr[0]")).toBe("first");
      expect(getData("Store.arr").length).toBe(1);
    });

    test("should set object as array element", () => {
      const { setData, getData } = useStore({ arr: [] as any[] }, "Store");

      setData("Store.arr[0]", { name: "Alice", age: 30 });
      expect(getData("Store.arr[0].name")).toBe("Alice");
      expect(getData("Store.arr[0].age")).toBe(30);
    });

    test("should set array as array element (nested arrays)", () => {
      const { setData, getData } = useStore({ matrix: [] as any[] }, "Store");

      setData("Store.matrix[0]", [1, 2, 3]);
      setData("Store.matrix[1]", [4, 5, 6]);
      expect(getData("Store.matrix[0][1]")).toBe(2);
      expect(getData("Store.matrix[1][2]")).toBe(6);
    });
  });

  describe("Nested property access on array elements", () => {
    test("should set a nested property on an object inside an array", () => {
      const { setData, getData } = useStore(
        { logs: [{ msg: "hello" }, { msg: "world" }] },
        "Page"
      );

      setData("Page.logs[1].msg", "updated");
      expect(getData("Page.logs[1].msg")).toBe("updated");
      expect(getData("Page.logs[0].msg")).toBe("hello");
    });

    test("should create intermediate object when setting nested path on array element", () => {
      const { setData, getData } = useStore({ arr: [null, null] }, "Store");

      setData("Store.arr[0].deep.value", 42);
      expect(getData("Store.arr[0].deep.value")).toBe(42);
    });

    test("should create intermediate array when setting nested array path on array element", () => {
      const { setData, getData } = useStore(
        { arr: [{ items: [] as any[] }] },
        "Store"
      );

      setData("Store.arr[0].items[2]", "value");
      const items = getData("Store.arr[0].items");
      expect(items.length).toBe(3);
      expect(items[2]).toBe("value");
    });
  });

  describe("Dynamic array index from expression", () => {
    test("should resolve dynamic array index from another store value", () => {
      const { store: indexStore } = useStore({ idx: 2 }, "Idx");
      const { getData, setData } = useStore(
        { items: ["a", "b", "c", "d"] },
        "Data",
        new StoreExtractor(indexStore, "Idx.")
      );

      expect(getData("Data.items[Idx.idx]")).toBe("c");
    });

    test("should resolve dynamic array index from same store", () => {
      const { getData, setData } = useStore(
        { items: ["x", "y", "z"], selectedIndex: 1 },
        "Store"
      );

      expect(getData("Store.items[Store.selectedIndex]")).toBe("y");
    });

    test("should set value using dynamic array index", () => {
      let store: any = { items: ["a", "b", "c"], idx: 1 };
      const map = new Map([["Store.", new StoreExtractor(store, "Store.")]]);

      setStoreData("Store.items[Store.idx]", store, "updated", "Store", map);
      expect(store.items[1]).toBe("updated");
    });

    test("should resolve expression with arithmetic on array index", () => {
      const { getData, setData } = useStore(
        { items: ["a", "b", "c", "d", "e"], offset: 3 },
        "Store"
      );

      // Expression: Store.offset - 1 should evaluate to 2
      expect(getData("Store.items[Store.offset - 1]")).toBe("c");
    });
  });

  describe("Array with expression-based index (length patterns)", () => {
    test("should access last element using length - 1 expression via external store", () => {
      const { store: metaStore, setData: setMeta } = useStore(
        { len: 5 },
        "Meta"
      );

      const { getData } = useStore(
        { logs: ["a", "b", "c", "d", "e"] },
        "Page",
        new StoreExtractor(metaStore, "Meta.")
      );

      // Meta.len - 1 = 4, so logs[4] = "e"
      expect(getData("Page.logs[Meta.len - 1]")).toBe("e");
    });

    test("should access second-to-last element using length - 2 pattern", () => {
      const { store: metaStore } = useStore({ len: 5 }, "Meta");
      const { getData } = useStore(
        { logs: ["a", "b", "c", "d", "e"] },
        "Page",
        new StoreExtractor(metaStore, "Meta.")
      );

      // Meta.len - 2 = 3, so logs[3] = "d"
      expect(getData("Page.logs[Meta.len - 2]")).toBe("d");
    });

    test("should set value at dynamically computed array index", () => {
      const { store: metaStore } = useStore({ len: 3 }, "Meta");
      const { getData, setData, store } = useStore(
        { items: ["a", "b", "c"] },
        "Data",
        new StoreExtractor(metaStore, "Meta.")
      );

      // Set at index Meta.len - 1 = 2
      setData("Data.items[Meta.len - 1]", "updated");
      expect(getData("Data.items[2]")).toBe("updated");
    });
  });

  describe("Array of objects - activityLogs pattern", () => {
    test("should access properties of objects in an array", () => {
      const { getData, setData } = useStore(
        {
          activityLogs: [
            { action: "login", timestamp: 100 },
            { action: "view", timestamp: 200 },
            { action: "edit", timestamp: 300 },
            { action: "save", timestamp: 400 },
            { action: "logout", timestamp: 500 },
          ],
        },
        "Page"
      );

      expect(getData("Page.activityLogs[0].action")).toBe("login");
      expect(getData("Page.activityLogs[4].action")).toBe("logout");
    });

    test("should set a property on an object inside activityLogs array", () => {
      const { getData, setData } = useStore(
        {
          activityLogs: [
            { action: "login", timestamp: 100 },
            { action: "view", timestamp: 200 },
            { action: "edit", timestamp: 300 },
          ],
        },
        "Page"
      );

      setData("Page.activityLogs[1].action", "updated-view");
      expect(getData("Page.activityLogs[1].action")).toBe("updated-view");
    });

    test("should append a new object to activityLogs using index at length", () => {
      const { getData, setData } = useStore(
        {
          activityLogs: [
            { action: "login", timestamp: 100 },
            { action: "view", timestamp: 200 },
          ],
        },
        "Page"
      );

      setData("Page.activityLogs[2]", { action: "edit", timestamp: 300 });
      expect(getData("Page.activityLogs").length).toBe(3);
      expect(getData("Page.activityLogs[2].action")).toBe("edit");
    });

    test("should access second-to-last activityLog via computed index", () => {
      const { store: metaStore } = useStore({ logCount: 5 }, "Meta");

      const { getData } = useStore(
        {
          activityLogs: [
            { action: "a" },
            { action: "b" },
            { action: "c" },
            { action: "d" },
            { action: "e" },
          ],
        },
        "Page",
        new StoreExtractor(metaStore, "Meta.")
      );

      // Meta.logCount - 2 = 3, activityLogs[3].action = "d"
      expect(getData("Page.activityLogs[Meta.logCount - 2].action")).toBe("d");
    });

    test("should set data on activityLogs at computed index with nested path", () => {
      const { store: metaStore } = useStore({ logCount: 3 }, "Meta");

      const { getData, setData } = useStore(
        {
          activityLogs: [
            { action: "a", details: {} },
            { action: "b", details: {} },
            { action: "c", details: {} },
          ],
        },
        "Page",
        new StoreExtractor(metaStore, "Meta.")
      );

      // Set at index Meta.logCount - 2 = 1
      setData("Page.activityLogs[Meta.logCount - 2].details.status", "done");
      expect(getData("Page.activityLogs[1].details.status")).toBe("done");
    });
  });

  describe("Multiple consecutive array indexes", () => {
    test("should handle 2D array access", () => {
      const { getData, setData } = useStore(
        {
          grid: [
            [1, 2, 3],
            [4, 5, 6],
            [7, 8, 9],
          ],
        },
        "Store"
      );

      expect(getData("Store.grid[1][2]")).toBe(6);
      setData("Store.grid[2][0]", 99);
      expect(getData("Store.grid[2][0]")).toBe(99);
    });

    test("should handle 3D array access", () => {
      const { getData, setData } = useStore(
        {
          cube: [
            [
              [1, 2],
              [3, 4],
            ],
            [
              [5, 6],
              [7, 8],
            ],
          ],
        },
        "Store"
      );

      expect(getData("Store.cube[1][0][1]")).toBe(6);
    });
  });
});

describe("Object with integer keys", () => {
  describe("Basic object with numeric string keys", () => {
    test("should set and get value with numeric key on an object", () => {
      const { setData, getData } = useStore({ obj: {} as any }, "Store");

      setData("Store.obj.1", "value-one");
      expect(getData("Store.obj.1")).toBe("value-one");
      expect(getData("Store.obj")).toStrictEqual({ "1": "value-one" });
    });

    test("should set multiple numeric keys on an object", () => {
      const { setData, getData } = useStore({ obj: {} as any }, "Store");

      setData("Store.obj.0", "zero");
      setData("Store.obj.1", "one");
      setData("Store.obj.2", "two");
      expect(getData("Store.obj")).toStrictEqual({
        "0": "zero",
        "1": "one",
        "2": "two",
      });
      // Should remain an object, not an array
      expect(Array.isArray(getData("Store.obj"))).toBe(false);
    });

    test("should handle object with pre-existing numeric keys", () => {
      const { setData, getData } = useStore(
        { data: { "0": "a", "1": "b", "2": "c" } as any },
        "Store"
      );

      expect(getData("Store.data.1")).toBe("b");
      setData("Store.data.1", "updated");
      expect(getData("Store.data.1")).toBe("updated");
      // Should still be an object, not an array
      expect(Array.isArray(getData("Store.data"))).toBe(false);
    });

    test("should set nested value through numeric key on object", () => {
      const { setData, getData } = useStore(
        { obj: { "1": { name: "first" } } as any },
        "Store"
      );

      setData("Store.obj.1.name", "updated");
      expect(getData("Store.obj.1.name")).toBe("updated");
    });

    test("should create intermediate object (not array) for path through uninitialized numeric key", () => {
      const { setData, getData } = useStore({ obj: {} as any }, "Store");

      // When obj is {} and we set obj.1.name, intermediate "1" key should create an object
      setData("Store.obj.1.name", "kiran");
      expect(getData("Store.obj.1.name")).toBe("kiran");
      expect(getData("Store.obj.1")).toStrictEqual({ name: "kiran" });
      expect(Array.isArray(getData("Store.obj"))).toBe(false);
    });
  });

  describe("Object with quoted numeric keys (bracket notation)", () => {
    test("should handle quoted numeric key in bracket notation", () => {
      const { setData, getData } = useStore({ obj: {} as any }, "Store");

      setData('Store.obj["3"]', "quoted-three");
      expect(getData('Store.obj["3"]')).toBe("quoted-three");
    });

    test("should handle single-quoted numeric key in bracket notation", () => {
      const { setData, getData } = useStore({ obj: {} as any }, "Store");

      setData("Store.obj['5']", "quoted-five");
      expect(getData("Store.obj['5']")).toBe("quoted-five");
    });

    test("should use quoted numeric key to force object key even when parent is object", () => {
      const { setData, getData } = useStore({ data: {} as any }, "Store");

      setData('Store.data["0"]', "zero");
      setData('Store.data["1"]', "one");
      expect(getData("Store.data")).toStrictEqual({ "0": "zero", "1": "one" });
      expect(Array.isArray(getData("Store.data"))).toBe(false);
    });
  });

  describe("Mixed numeric and string keys on objects", () => {
    test("should handle object with both numeric and string keys", () => {
      const { setData, getData } = useStore({ obj: {} as any }, "Store");

      setData("Store.obj.name", "Alice");
      setData("Store.obj.1", "numeric-one");
      setData("Store.obj.age", 30);

      expect(getData("Store.obj.name")).toBe("Alice");
      expect(getData("Store.obj.1")).toBe("numeric-one");
      expect(getData("Store.obj.age")).toBe(30);
      expect(Array.isArray(getData("Store.obj"))).toBe(false);
    });

    test("should handle object with numeric keys and nested objects", () => {
      const { setData, getData } = useStore({ obj: {} as any }, "Store");

      setData("Store.obj.1", { sub: "value" });
      setData("Store.obj.2", { sub: "another" });

      expect(getData("Store.obj.1.sub")).toBe("value");
      expect(getData("Store.obj.2.sub")).toBe("another");
    });
  });
});

describe("Array vs Object disambiguation", () => {
  describe("Correct type detection based on existing data", () => {
    test("should treat numeric index as array access when target is array", () => {
      const { setData, getData } = useStore(
        { data: [10, 20, 30] },
        "Store"
      );

      setData("Store.data[1]", 99);
      expect(getData("Store.data[1]")).toBe(99);
      expect(Array.isArray(getData("Store.data"))).toBe(true);
    });

    test("should treat numeric key as object access when target is object", () => {
      const { setData, getData } = useStore(
        { data: { "0": "a", "1": "b" } as any },
        "Store"
      );

      setData("Store.data.1", "updated");
      expect(getData("Store.data.1")).toBe("updated");
      expect(Array.isArray(getData("Store.data"))).toBe(false);
    });

    test("should use dot notation numeric as array index when target is array", () => {
      const { setData, getData } = useStore(
        { arr: ["first", "second", "third"] },
        "Store"
      );

      // Dot notation with numeric segment on an array
      setData("Store.arr.1", "UPDATED");
      expect(getData("Store.arr.1")).toBe("UPDATED");
      expect(getData("Store.arr").length).toBe(3);
    });

    test("should use dot notation numeric as object key when target is object", () => {
      const { setData, getData } = useStore({ obj: {} as any }, "Store");

      // First establish it as an object
      setData("Store.obj.name", "test");
      // Then use numeric key - should stay as object
      setData("Store.obj.1", "numeric");
      expect(getData("Store.obj.name")).toBe("test");
      expect(getData("Store.obj.1")).toBe("numeric");
      expect(Array.isArray(getData("Store.obj"))).toBe(false);
    });
  });

  describe("Intermediate creation: object vs array", () => {
    test("should create array intermediate when next segment is numeric and path uses bracket", () => {
      let store: any = {};
      const map = new Map([["Store.", new StoreExtractor(store, "Store.")]]);

      setStoreData("Store.data[0].name", store, "Alice", "Store", map);
      expect(Array.isArray(store.data)).toBe(true);
      expect(store.data[0].name).toBe("Alice");
    });

    test("should create object intermediate when next segment is string", () => {
      let store: any = {};
      const map = new Map([["Store.", new StoreExtractor(store, "Store.")]]);

      setStoreData("Store.data.name", store, "Alice", "Store", map);
      expect(typeof store.data).toBe("object");
      expect(Array.isArray(store.data)).toBe(false);
      expect(store.data.name).toBe("Alice");
    });

    test("should preserve array type when setting nested property via bracket index", () => {
      const { setData, getData } = useStore({} as any, "Store");

      setData("Store.list", [{ a: 1 }, { a: 2 }, { a: 3 }]);
      setData("Store.list[1].a", 99);
      expect(getData("Store.list[1].a")).toBe(99);
      expect(Array.isArray(getData("Store.list"))).toBe(true);
    });

    test("should preserve object type when setting nested property via dot numeric key", () => {
      const { setData, getData } = useStore({} as any, "Store");

      setData("Store.map", { "1": { a: 1 }, "2": { a: 2 } });
      setData("Store.map.1.a", 99);
      expect(getData("Store.map.1.a")).toBe(99);
      expect(Array.isArray(getData("Store.map"))).toBe(false);
    });
  });

  describe("Edge cases with empty containers", () => {
    test("should set element on initially empty array", () => {
      const { setData, getData } = useStore({ arr: [] as any[] }, "Store");

      setData("Store.arr[0]", { key: "value" });
      expect(getData("Store.arr[0].key")).toBe("value");
      expect(getData("Store.arr").length).toBe(1);
    });

    test("should set key on initially empty object with numeric key", () => {
      const { setData, getData } = useStore({ obj: {} as any }, "Store");

      setData("Store.obj.0", "zero");
      expect(getData("Store.obj.0")).toBe("zero");
      expect(Array.isArray(getData("Store.obj"))).toBe(false);
    });

    test("should replace entire array with new array", () => {
      const { setData, getData } = useStore(
        { items: [1, 2, 3] },
        "Store"
      );

      setData("Store.items", [10, 20]);
      expect(getData("Store.items").length).toBe(2);
      expect(getData("Store.items[0]")).toBe(10);
      expect(getData("Store.items[1]")).toBe(20);
    });

    test("should replace entire object (with numeric keys) with new object", () => {
      const { setData, getData } = useStore(
        { data: { "1": "old" } as any },
        "Store"
      );

      setData("Store.data", { "1": "new", "2": "added" });
      expect(getData("Store.data.1")).toBe("new");
      expect(getData("Store.data.2")).toBe("added");
    });
  });

  describe("Complex mixed scenarios", () => {
    test("should handle array of objects with numeric string keys", () => {
      const { setData, getData } = useStore(
        {
          rows: [
            { "0": "r0c0", "1": "r0c1" },
            { "0": "r1c0", "1": "r1c1" },
          ],
        },
        "Store"
      );

      // Access array index, then object numeric key
      expect(getData("Store.rows[0].0")).toBe("r0c0");
      expect(getData("Store.rows[1].1")).toBe("r1c1");

      setData("Store.rows[0].1", "updated");
      expect(getData("Store.rows[0].1")).toBe("updated");
    });

    test("should handle object containing arrays accessed by numeric keys", () => {
      const { setData, getData } = useStore(
        { data: { "1": [10, 20], "2": [30, 40] } as any },
        "Store"
      );

      expect(getData("Store.data.1[0]")).toBe(10);
      expect(getData("Store.data.2[1]")).toBe(40);
    });

    test("should handle deeply nested mix of arrays and objects with numeric keys", () => {
      const { setData, getData } = useStore({} as any, "Store");

      // Create: Store.a[0].b.1.c[2] = "deep"
      setData("Store.a", [{ b: { "1": { c: [null, null, "deep"] } } }]);
      expect(getData("Store.a[0].b.1.c[2]")).toBe("deep");
    });

    test("should handle setting on array element then accessing sub-object with numeric key", () => {
      const { setData, getData } = useStore(
        {
          items: [{ props: { "100": "hundred" } }],
        },
        "Store"
      );

      expect(getData("Store.items[0].props.100")).toBe("hundred");
      setData("Store.items[0].props.200", "two-hundred");
      expect(getData("Store.items[0].props.200")).toBe("two-hundred");
      // props should remain an object
      expect(Array.isArray(getData("Store.items[0].props"))).toBe(false);
    });
  });

  describe("setStoreData direct tests with arrays and numeric keys", () => {
    test("should set on array using bracket notation", () => {
      let store: any = { arr: ["a", "b", "c"] };
      const map = new Map([["S.", new StoreExtractor(store, "S.")]]);

      setStoreData("S.arr[1]", store, "B", "S", map);
      expect(store.arr[1]).toBe("B");
      expect(Array.isArray(store.arr)).toBe(true);
    });

    test("should set on object using dot notation with numeric segment", () => {
      let store: any = { obj: { "1": "old" } };
      const map = new Map([["S.", new StoreExtractor(store, "S.")]]);

      setStoreData("S.obj.1", store, "new", "S", map);
      expect(store.obj["1"]).toBe("new");
      expect(Array.isArray(store.obj)).toBe(false);
    });

    test("should create array when setting path like prefix.newArr[0]", () => {
      let store: any = {};
      const map = new Map([["S.", new StoreExtractor(store, "S.")]]);

      setStoreData("S.newArr[0]", store, "first", "S", map);
      expect(Array.isArray(store.newArr)).toBe(true);
      expect(store.newArr[0]).toBe("first");
    });

    test("should create object when setting path like prefix.newObj.0", () => {
      let store: any = {};
      const map = new Map([["S.", new StoreExtractor(store, "S.")]]);

      setStoreData("S.newObj.0", store, "first", "S", map);
      // "0" accessed via dot notation on a new key - intermediate should be object
      // (because splitPath makes "0" a separate part which is treated as a key)
      expect(store.newObj).toBeDefined();
    });

    test("should set nested value in array of objects at dynamic index", () => {
      let store: any = {
        logs: [
          { msg: "one" },
          { msg: "two" },
          { msg: "three" },
        ],
        idx: 1,
      };
      const map = new Map([["Store.", new StoreExtractor(store, "Store.")]]);

      setStoreData("Store.logs[Store.idx].msg", store, "UPDATED", "Store", map);
      expect(store.logs[1].msg).toBe("UPDATED");
    });

    test("should handle setting at computed index with subtraction", () => {
      let store: any = {
        logs: [
          { msg: "a" },
          { msg: "b" },
          { msg: "c" },
          { msg: "d" },
          { msg: "e" },
        ],
        count: 5,
      };
      const map = new Map([["Store.", new StoreExtractor(store, "Store.")]]);

      // Store.count - 2 = 3
      setStoreData("Store.logs[Store.count - 2].msg", store, "UPDATED", "Store", map);
      expect(store.logs[3].msg).toBe("UPDATED");
    });

    test("should handle setting at computed index with addition", () => {
      let store: any = {
        items: ["a", "b", "c", "d"],
        base: 1,
      };
      const map = new Map([["Store.", new StoreExtractor(store, "Store.")]]);

      // Store.base + 2 = 3
      setStoreData("Store.items[Store.base + 2]", store, "UPDATED", "Store", map);
      expect(store.items[3]).toBe("UPDATED");
    });
  });

  describe("Listener behavior with array indexes vs object keys", () => {
    test("should fire listener when array element is changed via index", () => {
      const mockCallback = jest.fn();
      const { setData, addListener } = useStore(
        { arr: [10, 20, 30] },
        "Store"
      );

      const unsub = addListener(mockCallback, "Store.arr[1]");
      setData("Store.arr[1]", 99);
      expect(mockCallback).toHaveBeenCalledTimes(1);
      unsub();
    });

    test("should fire listener when object numeric key is changed", () => {
      const mockCallback = jest.fn();
      const { setData, addListener } = useStore(
        { obj: { "1": "old" } as any },
        "Store"
      );

      const unsub = addListener(mockCallback, "Store.obj.1");
      setData("Store.obj.1", "new");
      expect(mockCallback).toHaveBeenCalledTimes(1);
      unsub();
    });

    test("should fire parent listener when array element changes (with children activity)", () => {
      const mockCallback = jest.fn();
      const { setData, addListenerWithChildrenActivity } = useStore(
        { arr: [1, 2, 3] },
        "Store"
      );

      const unsub = addListenerWithChildrenActivity(mockCallback, "Store.arr");
      setData("Store.arr[2]", 99);
      expect(mockCallback).toHaveBeenCalledTimes(1);
      unsub();
    });

    test("should fire parent listener when nested prop in array element changes", () => {
      const mockCallback = jest.fn();
      const { setData, addListenerWithChildrenActivity } = useStore(
        {
          activityLogs: [
            { action: "login" },
            { action: "view" },
          ],
        },
        "Page"
      );

      const unsub = addListenerWithChildrenActivity(
        mockCallback,
        "Page.activityLogs"
      );
      setData("Page.activityLogs[0].action", "logout");
      expect(mockCallback).toHaveBeenCalledTimes(1);
      unsub();
    });
  });
});

import { useStore } from "../src";
import { StoreExtractor } from "../src/StoreExtractor";
import { setStoreData } from "../src/SetData";

describe("Bracket Notation with Dotted Keys", () => {
  describe("Basic bracket notation with dotted keys", () => {
    test("should set and get property with double quotes", () => {
      const { getData, setData } = useStore({}, "Store");

      setData('Store.config["mail.props.port"]', 587);
      expect(getData('Store.config["mail.props.port"]')).toBe(587);
    });

    test("should set and get property with single quotes", () => {
      const { getData, setData } = useStore({}, "Store");

      setData("Store.config['mail.props.host']", "smtp.example.com");
      expect(getData("Store.config['mail.props.host']")).toBe("smtp.example.com");
    });

    test("should handle nested object with dotted key", () => {
      const { getData, setData } = useStore({}, "Context");

      setData("Context.settings['api.key.secret']", "secret123");
      expect(getData("Context.settings['api.key.secret']")).toBe("secret123");
    });

    test("should work with existing regular properties", () => {
      const { getData, setData } = useStore({ config: { simple: "value" } }, "Store");

      setData('Store.config["mail.props.port"]', 587);
      expect(getData("Store.config.simple")).toBe("value");
      expect(getData('Store.config["mail.props.port"]')).toBe(587);
    });
  });

  describe("Mixed bracket and dot notation", () => {
    test("should work with bracket notation followed by dot notation", () => {
      const { getData, setData } = useStore({}, "Store");

      setData('Store.obj["mail.props.port"]', { subfield: "subvalue" });
      expect(getData('Store.obj["mail.props.port"].subfield')).toBe("subvalue");
    });

    test("should work with dot notation followed by bracket notation", () => {
      const { getData, setData } = useStore({}, "Context");

      setData("Context.nested['field.with.dots']", "nestedValue");
      expect(getData("Context.nested['field.with.dots']")).toBe("nestedValue");
    });

    test("should handle complex path with multiple bracket notations", () => {
      const { getData, setData } = useStore({}, "Store");

      setData('Store.level1["a.b"]', { "c.d": "value" });
      expect(getData('Store.level1["a.b"]["c.d"]')).toBe("value");
    });
  });

  describe("Array and object combination", () => {
    test("should work with array index and dotted key access", () => {
      const { getData, setData } = useStore({}, "Store");

      setData("Store.arr[0]", { "prop.name": "first" });
      expect(getData('Store.arr[0]["prop.name"]')).toBe("first");
    });

    test("should handle dotted key containing array", () => {
      const { getData, setData } = useStore({}, "Context");

      setData("Context.data['items.list']", [10, 20, 30]);
      expect(getData("Context.data['items.list'][1]")).toBe(20);
    });
  });

  describe("Edge cases", () => {
    test("should handle property with multiple dots", () => {
      const { getData, setData } = useStore({}, "Store");

      setData('Store.obj["a.b.c.d"]', "deepValue");
      expect(getData('Store.obj["a.b.c.d"]')).toBe("deepValue");
    });

    test("should handle empty string key", () => {
      const { getData, setData } = useStore({}, "Store");

      setData('Store.obj[""]', "emptyKey");
      const obj = getData('Store.obj');
      expect(obj[""]).toBe("emptyKey");
    });

    test("should handle key with special characters", () => {
      const { getData, setData } = useStore({}, "Context");

      setData('Context.obj["key@#$%"]', "specialValue");
      expect(getData('Context.obj["key@#$%"]')).toBe("specialValue");
    });

    test("should handle key with spaces", () => {
      const { getData, setData } = useStore({}, "Store");

      setData('Store.obj["key with spaces"]', "spaceValue");
      expect(getData('Store.obj["key with spaces"]')).toBe("spaceValue");
    });

    test("should handle numeric-like string keys", () => {
      const { getData, setData } = useStore({}, "Store");

      setData('Store.obj["123.456"]', "numericString");
      expect(getData('Store.obj["123.456"]')).toBe("numericString");
    });
  });

  describe("Listener functionality with bracket notation", () => {
    test("should trigger listener when dotted key property is updated", () => {
      const mockCallback = jest.fn().mockImplementation(() => {});
      const { setData, addListener } = useStore({}, "Store");

      const unsubscribe = addListener(mockCallback, 'Store.config["mail.props.port"]');
      setData('Store.config["mail.props.port"]', 587);
      setData('Store.config["mail.props.port"]', 8080);

      expect(mockCallback.mock.calls.length).toBe(2);
      expect(mockCallback.mock.calls[1][1]).toBe(8080);
      unsubscribe();
    });

    test("should trigger parent listener when child with dotted key is updated", () => {
      const mockCallback = jest.fn().mockImplementation(() => {});
      const { setData, addListenerWithChildrenActivity } = useStore({}, "Store");

      const unsubscribe = addListenerWithChildrenActivity(mockCallback, "Store.config");
      setData('Store.config["mail.props.port"]', 587);

      expect(mockCallback.mock.calls.length).toBe(1);
      unsubscribe();
    });

    test("should call listener immediately with current value", () => {
      const mockCallback = jest.fn().mockImplementation(() => {});
      const { setData, addListenerAndCallImmediately } = useStore({}, "Context");

      setData("Context.settings['api.key']", "initialValue");
      const unsubscribe = addListenerAndCallImmediately(
        true,
        mockCallback,
        "Context.settings['api.key']"
      );

      expect(mockCallback.mock.calls.length).toBe(1);
      expect(mockCallback.mock.calls[0][1]).toBe("initialValue");
      unsubscribe();
    });
  });

  describe("Delete operations with bracket notation", () => {
    test("should delete property with dotted key", () => {
      let store: any = {};
      const map = new Map([["Store.", new StoreExtractor(store, "Store.")]]);

      setStoreData('Store.obj["mail.props.port"]', store, 587, "Store", map, undefined);
      expect(store.obj["mail.props.port"]).toBe(587);

      setStoreData('Store.obj["mail.props.port"]', store, undefined, "Store", map, true);
      expect(store.obj["mail.props.port"]).toBeUndefined();
    });

    test("should not delete property when value is false", () => {
      let store: any = {};
      const map = new Map([["Store.", new StoreExtractor(store, "Store.")]]);

      setStoreData('Store.config["feature.enabled"]', store, false, "Store", map, undefined);
      expect(store.config["feature.enabled"]).toBe(false);
    });
  });

  describe("Complex scenarios", () => {
    test("should handle configuration-like structure", () => {
      const { getData, setData } = useStore({}, "AppConfig");

      setData('AppConfig.mail["smtp.server.host"]', "smtp.example.com");
      setData('AppConfig.mail["smtp.server.port"]', 587);
      setData('AppConfig.mail["smtp.auth.user"]', "user@example.com");
      setData('AppConfig.mail["smtp.auth.password"]', "secret");

      expect(getData('AppConfig.mail["smtp.server.host"]')).toBe("smtp.example.com");
      expect(getData('AppConfig.mail["smtp.server.port"]')).toBe(587);
      expect(getData('AppConfig.mail["smtp.auth.user"]')).toBe("user@example.com");
      expect(getData('AppConfig.mail["smtp.auth.password"]')).toBe("secret");
    });

    test("should work with multiple stores", () => {
      const { store: storeA, setData: setDataA } = useStore({ data: {} }, "StoreA");

      const { getData, setData } = useStore({ data: {} }, "StoreB",
        new StoreExtractor(storeA, "StoreA.")
      );

      setDataA('StoreA.data["prop.name"]', "valueA");
      setData('StoreB.data["prop.name"]', "valueB");

      expect(getData('StoreA.data["prop.name"]')).toBe("valueA");
      expect(getData('StoreB.data["prop.name"]')).toBe("valueB");
    });

    test("should handle deep nesting with dotted keys", () => {
      const { getData, setData } = useStore({}, "Store");

      setData('Store.level1["a.b"].level2["c.d"].level3["e.f"]', "deepValue");
      expect(getData('Store.level1["a.b"].level2["c.d"].level3["e.f"]')).toBe("deepValue");
    });

    test("should handle cross-references between stores using dotted keys", () => {
      const { store: indexStore } = useStore({ index: 1 }, "Index");

      const { getData, setData } = useStore(
        { items: [{ "key.0": "zero" }, { "key.1": "one" }, { "key.2": "two" }] },
        "Data",
        new StoreExtractor(indexStore, "Index.")
      );

      expect(getData('Data.items[Index.index]["key.1"]')).toBe("one");
    });
  });

  describe("Real-world use cases", () => {
    test("should handle Java properties file-like keys", () => {
      const { getData, setData } = useStore({}, "Properties");

      setData('Properties.db["database.connection.url"]', "jdbc:mysql://localhost:3306/db");
      setData('Properties.db["database.connection.driver"]', "com.mysql.cj.jdbc.Driver");
      setData('Properties.db["database.pool.maxSize"]', 20);

      expect(getData('Properties.db["database.connection.url"]')).toBe("jdbc:mysql://localhost:3306/db");
      expect(getData('Properties.db["database.pool.maxSize"]')).toBe(20);
    });

    test("should handle Spring Boot property keys", () => {
      const { getData, setData } = useStore({}, "Config");

      setData('Config.app["spring.application.name"]', "my-service");
      setData('Config.app["spring.datasource.url"]', "jdbc:h2:mem:testdb");
      setData('Config.app["server.port"]', 8080);

      expect(getData('Config.app["spring.application.name"]')).toBe("my-service");
      expect(getData('Config.app["server.port"]')).toBe(8080);
    });

    test("should handle API response with dotted keys", () => {
      const { getData, setData } = useStore({}, "Response");

      const apiResponse = {
        "user.profile.name": "John Doe",
        "user.profile.email": "john@example.com",
        "user.settings.theme": "dark",
        "user.settings.notifications.email": true
      };

      setData("Response.data", apiResponse);

      expect(getData('Response.data["user.profile.name"]')).toBe("John Doe");
      expect(getData('Response.data["user.settings.theme"]')).toBe("dark");
      expect(getData('Response.data["user.settings.notifications.email"]')).toBe(true);
    });
  });

  describe("Array pre-existing functionality", () => {
    test("should still work with regular array index access", () => {
      const { getData, setData } = useStore({ arr: [10, 20, 30] }, "Store");

      expect(getData("Store.arr[0]")).toBe(10);
      expect(getData("Store.arr[2]")).toBe(30);
    });

    test("should work with array index in expressions", () => {
      const { store } = useStore({ index: 1 }, "Index");
      const { getData, setData } = useStore(
        { values: [100, 200, 300] },
        "Data",
        new StoreExtractor(store, "Index.")
      );

      expect(getData("Data.values[Index.index]")).toBe(200);
    });
  });
});

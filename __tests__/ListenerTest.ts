import { useStore } from "../src";

describe("Listener firing tests", () => {
  test("Basic listener fires on direct path change", () => {
    const mockCallback = jest.fn();
    const { setData, addListener } = useStore(
      { user: { name: "John", age: 30 } },
      "Store"
    );

    addListener(mockCallback, "Store.user.name");
    setData("Store.user.name", "Jane");

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith("Store.user.name", "Jane");
  });

  test("Listener fires on nested property change", () => {
    const mockCallback = jest.fn();
    const { setData, addListener } = useStore(
      { config: { server: { host: "localhost", port: 8080 } } },
      "Store"
    );

    addListener(mockCallback, "Store.config.server.port");
    setData("Store.config.server.port", 9090);

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith("Store.config.server.port", 9090);
  });

  test("Listener fires on array index change", () => {
    const mockCallback = jest.fn();
    const { setData, addListener } = useStore(
      { items: ["apple", "banana", "cherry"] },
      "Store"
    );

    addListener(mockCallback, "Store.items[1]");
    setData("Store.items[1]", "blueberry");

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith("Store.items[1]", "blueberry");
  });

  test("Listener fires with bracket notation for dotted keys", () => {
    const mockCallback = jest.fn();
    const { setData, addListener } = useStore(
      { obj: { "mail.smtp.otp": "123456" } },
      "Store"
    );

    addListener(mockCallback, 'Store.obj["mail.smtp.otp"]');
    setData('Store.obj["mail.smtp.otp"]', "654321");

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith(
      'Store.obj["mail.smtp.otp"]',
      "654321"
    );
  });

  test("Listener fires with nested bracket notation", () => {
    const mockCallback = jest.fn();
    const { setData, addListener } = useStore(
      {
        config: {
          "server.settings": {
            "database.host": "localhost",
            "database.port": 5432,
          },
        },
      },
      "Store"
    );

    addListener(
      mockCallback,
      'Store.config["server.settings"]["database.host"]'
    );
    setData('Store.config["server.settings"]["database.host"]', "127.0.0.1");

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith(
      'Store.config["server.settings"]["database.host"]',
      "127.0.0.1"
    );
  });

  test("Multiple listeners on same path all fire", () => {
    const mockCallback1 = jest.fn();
    const mockCallback2 = jest.fn();
    const mockCallback3 = jest.fn();
    const { setData, addListener } = useStore({ value: 10 }, "Store");

    addListener(mockCallback1, "Store.value");
    addListener(mockCallback2, "Store.value");
    addListener(mockCallback3, "Store.value");

    setData("Store.value", 20);

    expect(mockCallback1).toHaveBeenCalledTimes(1);
    expect(mockCallback2).toHaveBeenCalledTimes(1);
    expect(mockCallback3).toHaveBeenCalledTimes(1);
    expect(mockCallback1).toHaveBeenCalledWith("Store.value", 20);
    expect(mockCallback2).toHaveBeenCalledWith("Store.value", 20);
    expect(mockCallback3).toHaveBeenCalledWith("Store.value", 20);
  });

  test("Parent listener with children activity fires when child changes", () => {
    const mockCallback = jest.fn();
    const { setData, addListenerWithChildrenActivity } = useStore(
      { user: { profile: { name: "John" } } },
      "Store"
    );

    addListenerWithChildrenActivity(mockCallback, "Store.user.profile");
    setData("Store.user.profile.name", "Jane");

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback.mock.calls[0][0]).toBe("Store.user.profile");
    expect(mockCallback.mock.calls[0][1]).toMatchObject({ name: "Jane" });
  });

  test("Child listener fires when parent changes", () => {
    const mockCallback = jest.fn();
    const { setData, addListener } = useStore(
      { user: { profile: { name: "John", age: 30 } } },
      "Store"
    );

    addListener(mockCallback, "Store.user.profile.name");
    setData("Store.user.profile", { name: "Jane", age: 25 });

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith("Store.user.profile.name", "Jane");
  });

  test("Listener with children activity fires on child change", () => {
    const mockCallback = jest.fn();
    const { setData, addListenerWithChildrenActivity } = useStore(
      { section: { a: 1, b: 2, c: 3 } },
      "Store"
    );

    addListenerWithChildrenActivity(mockCallback, "Store.section");
    setData("Store.section.a", 10);

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback.mock.calls[0][1]).toMatchObject({ a: 10, b: 2, c: 3 });

    setData("Store.section.b", 20);

    expect(mockCallback).toHaveBeenCalledTimes(2);
    expect(mockCallback.mock.calls[1][1]).toMatchObject({ a: 10, b: 20, c: 3 });
  });

  test("Listener fires immediately when configured", () => {
    const mockCallback = jest.fn();
    const { setData, addListenerAndCallImmediately } = useStore(
      { value: "initial" },
      "Store"
    );

    addListenerAndCallImmediately(true, mockCallback, "Store.value");

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith("Store.value", "initial");

    setData("Store.value", "updated");
    expect(mockCallback).toHaveBeenCalledTimes(2);
    expect(mockCallback).toHaveBeenCalledWith("Store.value", "updated");
  });

  test("Unsubscribe stops listener from firing", () => {
    const mockCallback = jest.fn();
    const { setData, addListener } = useStore({ value: 1 }, "Store");

    const unsubscribe = addListener(mockCallback, "Store.value");
    setData("Store.value", 2);
    expect(mockCallback).toHaveBeenCalledTimes(1);

    unsubscribe();
    setData("Store.value", 3);
    expect(mockCallback).toHaveBeenCalledTimes(1); // Still 1, not 2
  });

  test("Multiple listeners with different unsubscribe", () => {
    const mockCallback1 = jest.fn();
    const mockCallback2 = jest.fn();
    const { setData, addListener } = useStore({ value: 1 }, "Store");

    const unsubscribe1 = addListener(mockCallback1, "Store.value");
    addListener(mockCallback2, "Store.value");

    setData("Store.value", 2);
    expect(mockCallback1).toHaveBeenCalledTimes(1);
    expect(mockCallback2).toHaveBeenCalledTimes(1);

    unsubscribe1();
    setData("Store.value", 3);
    expect(mockCallback1).toHaveBeenCalledTimes(1); // Stopped
    expect(mockCallback2).toHaveBeenCalledTimes(2); // Still firing
  });

  test("Listener fires on deep nested path with mixed notation", () => {
    const mockCallback = jest.fn();
    const { setData, addListener } = useStore(
      {
        page: {
          components: [
            { id: "comp1", props: { "config.key": "value1" } },
            { id: "comp2", props: { "config.key": "value2" } },
          ],
        },
      },
      "Store"
    );

    addListener(mockCallback, 'Store.page.components[0].props["config.key"]');
    setData('Store.page.components[0].props["config.key"]', "updated");

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith(
      'Store.page.components[0].props["config.key"]',
      "updated"
    );
  });

  test("Listener with children activity on array fires when array element changes", () => {
    const mockCallback = jest.fn();
    const { setData, addListenerWithChildrenActivity } = useStore(
      { list: [{ name: "item1" }, { name: "item2" }] },
      "Store"
    );

    addListenerWithChildrenActivity(mockCallback, "Store.list");
    setData("Store.list[0].name", "updated");

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback.mock.calls[0][1]).toMatchObject([
      { name: "updated" },
      { name: "item2" },
    ]);
  });

  test("Listener does not fire for unrelated path changes", () => {
    const mockCallback = jest.fn();
    const { setData, addListener } = useStore(
      { user: { name: "John" }, config: { theme: "dark" } },
      "Store"
    );

    addListener(mockCallback, "Store.user.name");
    setData("Store.config.theme", "light");

    expect(mockCallback).not.toHaveBeenCalled();
  });

  test("Listener fires multiple times for rapid changes", () => {
    const mockCallback = jest.fn();
    const { setData, addListener } = useStore({ counter: 0 }, "Store");

    addListener(mockCallback, "Store.counter");
    setData("Store.counter", 1);
    setData("Store.counter", 2);
    setData("Store.counter", 3);

    expect(mockCallback).toHaveBeenCalledTimes(3);
    expect(mockCallback.mock.calls[0][1]).toBe(1);
    expect(mockCallback.mock.calls[1][1]).toBe(2);
    expect(mockCallback.mock.calls[2][1]).toBe(3);
  });

  test("Listener receives undefined when path is deleted", () => {
    const mockCallback = jest.fn();
    const { setData, addListener } = useStore(
      { temp: { data: "exists" } },
      "Store"
    );

    addListener(mockCallback, "Store.temp.data");
    setData("Store.temp.data", undefined, true);

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith("Store.temp.data", undefined);
  });

  test("Complex scenario with page store simulation", () => {
    const mockCallback = jest.fn();
    const { setData, addListener } = useStore(
      {
        pageData: {
          testPage: {
            obj: {
              "mail.smtp.host": "smtp.example.com",
              "mail.smtp.port": 587,
              "mail.smtp.otp": "123456",
            },
          },
        },
      },
      "Store"
    );

    addListener(
      mockCallback,
      'Store.pageData.testPage.obj["mail.smtp.otp"]'
    );
    setData('Store.pageData.testPage.obj["mail.smtp.otp"]', "654321");

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith(
      'Store.pageData.testPage.obj["mail.smtp.otp"]',
      "654321"
    );
  });

  test("Listener on root level path", () => {
    const mockCallback = jest.fn();
    const { setData, addListener, getData } = useStore({ version: "1.0" }, "Store");

    addListener(mockCallback, "Store.version");
    setData("Store.version", "2.0");

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith("Store.version", "2.0");
    expect(getData("Store.version")).toBe("2.0");
  });

  test("Listener with children activity and immediate call", () => {
    const mockCallback = jest.fn();
    const { setData, addListenerAndCallImmediatelyWithChildrenActivity } =
      useStore({ section: { a: 1, b: 2 } }, "Store");

    addListenerAndCallImmediatelyWithChildrenActivity(
      true,
      mockCallback,
      "Store.section"
    );

    // Called immediately with initial value
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback.mock.calls[0][1]).toMatchObject({ a: 1, b: 2 });

    setData("Store.section.a", 10);
    expect(mockCallback).toHaveBeenCalledTimes(2);
    expect(mockCallback.mock.calls[1][1]).toMatchObject({ a: 10, b: 2 });
  });

  test("Multiple paths in single addListener call", () => {
    const mockCallback = jest.fn();
    const { setData, addListener } = useStore(
      { field1: "a", field2: "b", field3: "c" },
      "Store"
    );

    addListener(mockCallback, "Store.field1", "Store.field2", "Store.field3");

    setData("Store.field1", "x");
    expect(mockCallback).toHaveBeenCalledTimes(1);

    setData("Store.field2", "y");
    expect(mockCallback).toHaveBeenCalledTimes(2);

    setData("Store.field3", "z");
    expect(mockCallback).toHaveBeenCalledTimes(3);
  });

  test("Listener callback is not called twice for same change in children activity mode", () => {
    const mockCallback = jest.fn();
    const { setData, addListenerWithChildrenActivity } = useStore(
      { obj: { a: 1, b: 2 } },
      "Store"
    );

    // Add same callback twice
    addListenerWithChildrenActivity(mockCallback, "Store.obj");
    addListenerWithChildrenActivity(mockCallback, "Store.obj");

    setData("Store.obj.a", 10);

    // The callback should be called only once per change due to set deduplication
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  test("Bracket notation works with single quotes", () => {
    const mockCallback = jest.fn();
    const { setData, addListener } = useStore(
      { obj: { "mail.smtp.otp": "initial" } },
      "Store"
    );

    addListener(mockCallback, "Store.obj['mail.smtp.otp']");
    setData("Store.obj['mail.smtp.otp']", "updated");

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith(
      "Store.obj['mail.smtp.otp']",
      "updated"
    );
  });

  test("Bracket notation works with double quotes", () => {
    const mockCallback = jest.fn();
    const { setData, addListener } = useStore(
      { obj: { "mail.smtp.otp": "initial" } },
      "Store"
    );

    addListener(mockCallback, 'Store.obj["mail.smtp.otp"]');
    setData('Store.obj["mail.smtp.otp"]', "updated");

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith(
      'Store.obj["mail.smtp.otp"]',
      "updated"
    );
  });

  test("Mixed quotes in same path work correctly", () => {
    const mockCallback = jest.fn();
    const { setData, addListener } = useStore(
      {
        config: {
          "server.host": {
            "db.connection": "localhost",
          },
        },
      },
      "Store"
    );

    addListener(mockCallback, 'Store.config["server.host"][\'db.connection\']');
    setData('Store.config["server.host"][\'db.connection\']', "127.0.0.1");

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith(
      'Store.config["server.host"][\'db.connection\']',
      "127.0.0.1"
    );
  });

  test("Single and double quotes access same property", () => {
    const { setData, getData } = useStore(
      { obj: { "dotted.key": "value" } },
      "Store"
    );

    // Set with single quotes
    setData("Store.obj['dotted.key']", "updated-single");
    expect(getData('Store.obj["dotted.key"]')).toBe("updated-single");

    // Set with double quotes
    setData('Store.obj["dotted.key"]', "updated-double");
    expect(getData("Store.obj['dotted.key']")).toBe("updated-double");
  });

  test("Listener requires matching quote style for path", () => {
    const mockCallback = jest.fn();
    const { setData, addListener } = useStore(
      { obj: { "key.with.dots": "initial" } },
      "Store"
    );

    // Add listener with double quotes
    addListener(mockCallback, 'Store.obj["key.with.dots"]');

    // Set data with single quotes - won't trigger listener (different path string)
    setData("Store.obj['key.with.dots']", "value1");
    expect(mockCallback).toHaveBeenCalledTimes(0);

    // Set data with double quotes - will trigger listener (matching path string)
    setData('Store.obj["key.with.dots"]', "value2");
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  test("Deep nested path with bracket notation", () => {
    const mockCallback = jest.fn();
    const { setData, addListener } = useStore(
      {
        pageData: {
          testPage: {
            obj: {
              "mail.smtp.otp": "123456",
            },
          },
        },
      },
      "Store"
    );

    addListener(mockCallback, 'Store.pageData.testPage.obj["mail.smtp.otp"]');
    setData('Store.pageData.testPage.obj["mail.smtp.otp"]', "654321");

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith(
      'Store.pageData.testPage.obj["mail.smtp.otp"]',
      "654321"
    );
  });

  test("Multiple dotted keys in deep path", () => {
    const mockCallback = jest.fn();
    const { setData, addListener } = useStore(
      {
        pageData: {
          testPage: {
            config: {
              "server.settings": {
                "mail.smtp.host": "smtp.example.com",
                "mail.smtp.port": 587,
              },
            },
          },
        },
      },
      "Store"
    );

    addListener(
      mockCallback,
      'Store.pageData.testPage.config["server.settings"]["mail.smtp.host"]'
    );
    setData(
      'Store.pageData.testPage.config["server.settings"]["mail.smtp.host"]',
      "smtp.gmail.com"
    );

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith(
      'Store.pageData.testPage.config["server.settings"]["mail.smtp.host"]',
      "smtp.gmail.com"
    );
  });

  test("Deep path with array and dotted keys", () => {
    const mockCallback = jest.fn();
    const { setData, addListener } = useStore(
      {
        pageData: {
          testPage: {
            components: [
              { id: 1, config: { "api.endpoint": "/api/v1" } },
              { id: 2, config: { "api.endpoint": "/api/v2" } },
            ],
          },
        },
      },
      "Store"
    );

    addListener(
      mockCallback,
      'Store.pageData.testPage.components[0].config["api.endpoint"]'
    );
    setData(
      'Store.pageData.testPage.components[0].config["api.endpoint"]',
      "/api/v3"
    );

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith(
      'Store.pageData.testPage.components[0].config["api.endpoint"]',
      "/api/v3"
    );
  });

  test("Very deep nested structure with multiple dotted keys", () => {
    const mockCallback = jest.fn();
    const { setData, addListener } = useStore(
      {
        application: {
          pages: {
            main: {
              components: {
                form: {
                  fields: {
                    "user.email.validation": {
                      "regex.pattern": "^[a-z]+@[a-z]+\\.[a-z]+$",
                    },
                  },
                },
              },
            },
          },
        },
      },
      "Store"
    );

    addListener(
      mockCallback,
      'Store.application.pages.main.components.form.fields["user.email.validation"]["regex.pattern"]'
    );
    setData(
      'Store.application.pages.main.components.form.fields["user.email.validation"]["regex.pattern"]',
      "^\\w+@\\w+\\.\\w+$"
    );

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith(
      'Store.application.pages.main.components.form.fields["user.email.validation"]["regex.pattern"]',
      "^\\w+@\\w+\\.\\w+$"
    );
  });

  test("Deep path listener with children activity", () => {
    const mockCallback = jest.fn();
    const { setData, addListenerWithChildrenActivity } = useStore(
      {
        pageData: {
          testPage: {
            state: {
              "form.data": {
                name: "John",
                email: "john@example.com",
              },
            },
          },
        },
      },
      "Store"
    );

    addListenerWithChildrenActivity(
      mockCallback,
      'Store.pageData.testPage.state["form.data"]'
    );

    // Change nested property
    setData('Store.pageData.testPage.state["form.data"].name', "Jane");

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback.mock.calls[0][1]).toMatchObject({
      name: "Jane",
      email: "john@example.com",
    });

    // Change another nested property
    setData(
      'Store.pageData.testPage.state["form.data"].email',
      "jane@example.com"
    );

    expect(mockCallback).toHaveBeenCalledTimes(2);
    expect(mockCallback.mock.calls[1][1]).toMatchObject({
      name: "Jane",
      email: "jane@example.com",
    });
  });

  test("Deep path with getData and setData", () => {
    const { setData, getData } = useStore(
      {
        pageData: {
          testPage: {
            obj: {
              "mail.smtp.otp": "initial",
            },
          },
        },
      },
      "Store"
    );

    // Get initial value
    expect(
      getData('Store.pageData.testPage.obj["mail.smtp.otp"]')
    ).toBe("initial");

    // Set new value
    setData('Store.pageData.testPage.obj["mail.smtp.otp"]', "updated");

    // Get updated value
    expect(getData('Store.pageData.testPage.obj["mail.smtp.otp"]')).toBe(
      "updated"
    );
  });

  test("Deep path with mixed arrays and dotted keys", () => {
    const mockCallback = jest.fn();
    const { setData, addListener } = useStore(
      {
        pageData: {
          testPage: {
            layers: [
              {
                elements: [
                  {
                    properties: {
                      "style.color": "red",
                      "style.size": 14,
                    },
                  },
                ],
              },
            ],
          },
        },
      },
      "Store"
    );

    addListener(
      mockCallback,
      'Store.pageData.testPage.layers[0].elements[0].properties["style.color"]'
    );
    setData(
      'Store.pageData.testPage.layers[0].elements[0].properties["style.color"]',
      "blue"
    );

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith(
      'Store.pageData.testPage.layers[0].elements[0].properties["style.color"]',
      "blue"
    );
  });

  test("Deep path listener fires on parent change", () => {
    const mockCallback = jest.fn();
    const { setData, addListener } = useStore(
      {
        pageData: {
          testPage: {
            config: {
              "server.settings": {
                "mail.smtp.host": "localhost",
              },
            },
          },
        },
      },
      "Store"
    );

    addListener(
      mockCallback,
      'Store.pageData.testPage.config["server.settings"]["mail.smtp.host"]'
    );

    // Change parent object
    setData('Store.pageData.testPage.config["server.settings"]', {
      "mail.smtp.host": "smtp.gmail.com",
      "mail.smtp.port": 587,
    });

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith(
      'Store.pageData.testPage.config["server.settings"]["mail.smtp.host"]',
      "smtp.gmail.com"
    );
  });

  test("Multiple listeners on different levels of deep path", () => {
    const mockCallback1 = jest.fn();
    const mockCallback2 = jest.fn();
    const mockCallback3 = jest.fn();
    const { setData, addListener, addListenerWithChildrenActivity } = useStore(
      {
        pageData: {
          testPage: {
            obj: {
              "mail.smtp.otp": "123456",
            },
          },
        },
      },
      "Store"
    );

    // Listen at different levels with children activity for parents
    addListenerWithChildrenActivity(mockCallback1, "Store.pageData.testPage");
    addListenerWithChildrenActivity(mockCallback2, "Store.pageData.testPage.obj");
    addListener(mockCallback3, 'Store.pageData.testPage.obj["mail.smtp.otp"]');

    // Change the deepest level
    setData('Store.pageData.testPage.obj["mail.smtp.otp"]', "654321");

    // All three should fire because they're in the parent chain
    expect(mockCallback1).toHaveBeenCalledTimes(1);
    expect(mockCallback2).toHaveBeenCalledTimes(1);
    expect(mockCallback3).toHaveBeenCalledTimes(1);
  });

  test("Deep path with triple dotted keys", () => {
    const mockCallback = jest.fn();
    const { setData, addListener } = useStore(
      {
        config: {
          "server.mail.settings": {
            "smtp.connection.timeout": 5000,
          },
        },
      },
      "Store"
    );

    addListener(
      mockCallback,
      'Store.config["server.mail.settings"]["smtp.connection.timeout"]'
    );
    setData(
      'Store.config["server.mail.settings"]["smtp.connection.timeout"]',
      10000
    );

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith(
      'Store.config["server.mail.settings"]["smtp.connection.timeout"]',
      10000
    );
  });
});

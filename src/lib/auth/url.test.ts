import { describe, expect, test } from "bun:test";
import { buildCustomerMainappUrl, parseUrlInput } from "./url";

describe("parseUrlInput", () => {
  describe("returns an error for empty / unparseable input", () => {
    test("undefined", () => {
      expect(parseUrlInput(undefined)).toEqual({ error: "No URL provided" });
    });

    test("empty string", () => {
      expect(parseUrlInput("")).toEqual({ error: "No URL provided" });
    });

    test("completely invalid string", () => {
      expect(parseUrlInput(":::not a url:::")).toEqual({
        error: 'Invalid URL: ":::not a url:::"',
      });
    });
  });

  describe("parses standard customer hostnames", () => {
    test("bare hostname", () => {
      expect(parseUrlInput("123456.observeinc.com")).toEqual({
        baseUrl: "https://123456.observeinc.com",
        customerId: "123456",
        domain: "observeinc.com",
      });
    });

    test("https:// URL", () => {
      expect(parseUrlInput("https://123456.observeinc.com")).toEqual({
        baseUrl: "https://123456.observeinc.com",
        customerId: "123456",
        domain: "observeinc.com",
      });
    });

    test("http:// URL", () => {
      expect(parseUrlInput("http://123456.observeinc.com")).toEqual({
        baseUrl: "http://123456.observeinc.com",
        customerId: "123456",
        domain: "observeinc.com",
      });
    });

    test("URL with a trailing path is ignored for parsing", () => {
      expect(parseUrlInput("https://123456.observeinc.com/some/path")).toEqual({
        baseUrl: "https://123456.observeinc.com",
        customerId: "123456",
        domain: "observeinc.com",
      });
    });

    test("URL with a port preserves the port in the base URL", () => {
      expect(parseUrlInput("https://123456.observeinc.com:8080")).toEqual({
        baseUrl: "https://123456.observeinc.com:8080",
        customerId: "123456",
        domain: "observeinc.com",
      });
    });

    test("bare customer hostname with a port", () => {
      expect(parseUrlInput("123456.example.com:1234")).toEqual({
        baseUrl: "https://123456.example.com:1234",
        customerId: "123456",
        domain: "example.com",
      });
    });
  });

  describe("handles non-standard hostnames (no customerId)", () => {
    test("bare hostname without leading digits", () => {
      expect(parseUrlInput("account.observeinc.com")).toEqual({
        baseUrl: "https://account.observeinc.com",
        domain: "account.observeinc.com",
      });
    });

    test("plain domain", () => {
      expect(parseUrlInput("localhost")).toEqual({
        baseUrl: "https://localhost",
        domain: "localhost",
      });
    });

    test("IP address", () => {
      expect(parseUrlInput("192.168.1.1")).toEqual({
        baseUrl: "https://192.168.1.1",
        domain: "192.168.1.1",
      });
    });
  });
});

describe("buildCustomerMainappUrl", () => {
  test("keeps an explicit URL port without an override", () => {
    expect(
      buildCustomerMainappUrl({
        baseUrl: "https://123456.example.com:1234",
      }),
    ).toBe("https://123456.example.com:1234");
  });

  test("applies a configured port override", () => {
    expect(
      buildCustomerMainappUrl({
        baseUrl: "https://123456.example.com:1234",
        port: "8443",
      }),
    ).toBe("https://123456.example.com:8443");
  });
});

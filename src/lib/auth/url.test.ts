import { describe, expect, test } from "bun:test";
import { parseUrlInput } from "./url";

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
        customerId: "123456",
        domain: "observeinc",
      });
    });

    test("https:// URL", () => {
      expect(parseUrlInput("https://123456.observeinc.com")).toEqual({
        customerId: "123456",
        domain: "observeinc",
      });
    });

    test("http:// URL", () => {
      expect(parseUrlInput("http://123456.observeinc.com")).toEqual({
        customerId: "123456",
        domain: "observeinc",
      });
    });

    test("URL with a trailing path is ignored for parsing", () => {
      expect(parseUrlInput("https://123456.observeinc.com/some/path")).toEqual({
        customerId: "123456",
        domain: "observeinc",
      });
    });

    test("URL with a port is ignored for parsing", () => {
      expect(parseUrlInput("https://123456.observeinc.com:8080")).toEqual({
        customerId: "123456",
        domain: "observeinc",
      });
    });
  });

  describe("handles non-standard hostnames (no customerId)", () => {
    test("bare hostname without leading digits", () => {
      expect(parseUrlInput("account.observeinc.com")).toEqual({
        domain: "account.observeinc.com",
      });
    });

    test("plain domain", () => {
      expect(parseUrlInput("localhost")).toEqual({
        domain: "localhost",
      });
    });

    test("IP address", () => {
      expect(parseUrlInput("192.168.1.1")).toEqual({
        domain: "192.168.1.1",
      });
    });
  });
});

import { HandlersParams } from "./interfaces";
import { UpploadSettings } from "../uppload";

export type Elements = string | string[] | Element | Element[];

/**
 * Gets all the DOM elements matching a selector
 * @param query - CSS selector string, HTML element, or an array of them
 */
export const getElements = (query?: Elements): Element[] => {
  if (!query) return [];
  const elements: Element[] = [];
  if (typeof query === "string") {
    elements.push(
      ...Array.prototype.slice.call(document.querySelectorAll(query))
    );
  } else if (Array.isArray(query)) {
    query.forEach((item: string | Element) => {
      if (typeof item === "string") {
        elements.push(
          ...Array.prototype.slice.call(document.querySelectorAll(item))
        );
      } else {
        elements.push(item);
      }
    });
  } else {
    elements.push(query);
  }
  return elements;
};

const listening: { element: Element; type: string }[] = [];

/**
 * Safely adds an event listener, preventing duplicates
 * @param element - HTML element to add event listener to
 * @param type - Type of event listener to add
 * @param fn - Callback function to call on event
 */
export const safeListen = (
  element: Element,
  type: string,
  fn: EventListenerOrEventListenerObject
) => {
  const hasListener = !!listening.find(
    a => a.element === element && a.type === type
  );
  if (hasListener) return;
  element.addEventListener(type, fn);
  listening.push({ element, type });
};

const safeRequestAnimationFrame = (callback: FrameRequestCallback) => {
  if (window.requestAnimationFrame)
    return window.requestAnimationFrame(callback);
  setTimeout(() => {
    callback(0);
  }, 100);
};

/**
 *
 * @param image - An HTML <img> element in the DOM
 */
export const fitImageToContainer = (
  params: HandlersParams,
  image: HTMLImageElement | HTMLVideoElement
): Promise<undefined> => {
  return new Promise(resolve => {
    safeRequestAnimationFrame(() => {
      const parent = image.parentElement as HTMLDivElement | null;
      const currentDimensions = image.getBoundingClientRect();
      if (!parent) return;
      const dimensions = parent.getBoundingClientRect();
      if (currentDimensions.height < currentDimensions.width) {
        image.style.height = `${dimensions.height}px`;
        image.style.width = "auto";
      } else {
        image.style.width = `${dimensions.width}px`;
        image.style.height = "auto";
      }
      safeRequestAnimationFrame(() => {
        const currentDimensions = image.getBoundingClientRect();
        if (currentDimensions.height > dimensions.height) {
          image.style.height = `${dimensions.height}px`;
          image.style.width = "auto";
        } else if (currentDimensions.width > dimensions.width) {
          image.style.width = `${dimensions.width}px`;
          image.style.height = "auto";
        }
        safeRequestAnimationFrame(() => {
          const effect = params.uppload.container.querySelector(
            ".uppload-effect"
          ) as HTMLDivElement | null;
          if (effect) effect.style.opacity = "1";
          resolve();
        });
      });
    });
  });
};

/**
 * Compress an image using lossy canvas compression
 * @param file - Image file to compress
 * @param settings - Uppload settings defined in the constructor
 */
export const compressImage = (
  file: Blob,
  settings: UpploadSettings
): Promise<Blob> =>
  new Promise(resolve => {
    const imageURL = URL.createObjectURL(file);
    const canvas = document.createElement("canvas");
    const image = document.createElement("img");
    const maxSize = settings.maxSize || [
      settings.maxWidth || Infinity,
      settings.maxHeight || Infinity
    ];
    image.src = imageURL;
    image.onload = () => {
      const type = settings.compressionMime || "image/jpeg";
      const quality = settings.compression || 1;
      const ratio = image.width / image.height;
      if (image.width > maxSize[0]) {
        image.width = maxSize[0];
        image.height = image.width * (1 / ratio);
      }
      if (image.height > maxSize[1]) {
        image.height = maxSize[1];
        image.width = image.height * ratio;
      }
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d");
      if (!context) return resolve(file);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        blob => {
          if (blob) return resolve(blob);
          resolve(file);
        },
        type,
        quality
      );
    };
  });

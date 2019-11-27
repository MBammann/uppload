import { UpploadService } from "../service";
import { translate } from "../helpers/i18n";
import { HandlersParams } from "./interfaces";
import { imageUrlToBlob, cachedFetch } from "./http";
import { colorSVG } from "./assets";

export class MicrolinkBaseClass extends UpploadService {
  loading = false;
  exampleURL = "";
  validator: (value: string) => boolean = () => true;

  template = (): string => {
    return `
      <div class="microlink-container">
      <form class="microlink-search-form">
        <div class="service-icon">${colorSVG(this.icon, this)}</div>
        <label>
          <span>${translate(`services.${this.name}.label`) ||
            translate("services.microlink.label", [
              translate(`services.${this.name}.title`) || this.name,
              translate(`services.${this.name}.type`) ||
                translate("services.microlink.type")
            ])}</span>
          <input class="microlink-search-input" type="url" placeholder="${translate(
            `services.${this.name}.placeholder`
          ) ||
            translate("services.microlink.placeholder", [
              translate(`services.${this.name}.title`) || this.name,
              translate(`services.${this.name}.type`) ||
                translate("services.microlink.type")
            ]) ||
            ""}" required>
        </label>
        <button type="submit" style="background: ${this.color}">${translate(
      `services.${this.name}.button`
    ) ||
      translate(
        "services.microlink.button",
        translate(`services.${this.name}.title`) || this.name
      )}</button></form></div><div class="uppload-loader microlink-loader">
    <div></div>
    <p>${translate(`services.${this.name}.loading`) ||
      translate(
        "services.microlink.loading",
        translate(`services.${this.name}.title`) || this.name
      ) ||
      translate("fetching", translate(`services.${this.name}.title`))}</p>
  </div>`;
  };

  update(params: HandlersParams) {
    const loader = params.uppload.container.querySelector(
      ".microlink-loader"
    ) as HTMLDivElement;
    const container = params.uppload.container.querySelector(
      ".microlink-container"
    ) as HTMLDivElement;
    if (container) container.style.display = this.loading ? "none" : "";
    if (loader) loader.style.display = this.loading ? "flex" : "none";
  }

  handlers = (params: HandlersParams) => {
    const form = params.uppload.container.querySelector(
      `.microlink-search-form`
    ) as HTMLFormElement | null;
    if (form) {
      form.addEventListener("submit", event => {
        event.preventDefault();
        const input = params.uppload.container.querySelector(
          `.microlink-search-input`
        ) as HTMLInputElement | null;
        if (input) {
          const url = input.value;
          if (!this.validator(url))
            return params.handle(new Error("errors.invalid_url"));
          this.loading = true;
          this.update(params);
          if (this.name === "screenshot") {
            imageUrlToBlob(
              `https://api.microlink.io?url=${encodeURIComponent(
                url
              )}&screenshot=true&meta=false&embed=screenshot.url`
            )
              .then(blob => params.next(blob))
              .catch(error => params.handle(error))
              .then(() => (this.loading = false));
          } else if (this.name === "url") {
            imageUrlToBlob(url)
              .then(blob => params.next(blob))
              .catch(error => params.handle(error));
          } else {
            cachedFetch<{
              data: {
                image?: {
                  url: string;
                };
              };
            }>(`https://api.microlink.io/?url=${encodeURIComponent(url)}`)
              .then(result => {
                if (!result.data.image || !result.data.image.url)
                  throw new Error("errors.response_not_ok");
                return result.data.image.url;
              })
              .then(url => imageUrlToBlob(url))
              .then(blob => params.next(blob))
              .catch(error => params.handle(error));
          }
        }
        return false;
      });
    }
  };
}

import { ApplyPluginsType } from "@umijs/core/dist/types";
import { applyConfigFromSchema } from "./config";
import { DoctorLevel, IApi } from "./types";
import { applyTypeEffect } from "./utils";
import { logger } from "@umijs/utils";
import { chalk } from "@umijs/utils";
export interface ruleResItem {
  label: string;
  description: string;
  doctorLevel: DoctorLevel | "success";
}

function transformString(str: string) {
  const parts = str.split("-");
  const capitalizedParts = parts.map((part) => {
    return part.charAt(0).toUpperCase() + part.slice(1);
  });
  return capitalizedParts.join("");
}

function sort(webToolsRes: ruleResItem[]) {
  return webToolsRes.sort((a, b) => {
    if (a.doctorLevel === b.doctorLevel) {
      return 0;
    } else if (a.doctorLevel === "warn") {
      return -1;
    } else if (b.doctorLevel === "warn") {
      return 1;
    } else if (a.doctorLevel === "error") {
      return -1;
    } else {
      return 1;
    }
  });
}

export default function (api: IApi, command: string, schema: Object) {
  applyTypeEffect(api, transformString(command));
  applyConfigFromSchema(api, schema);
  api.registerCommand({
    name: command,
    description: "start incremental build in watch mode",
    async fn() {
      //----------------- check before ------------------
      (await api.applyPlugins({
        key: `addDoctor${transformString(command)}CheckBefore`,
        type: ApplyPluginsType.add,
      })) as ruleResItem[];

      //----------------- checking ------------------
      const webToolsRes = (await api.applyPlugins({
        key: `addDoctor${transformString(command)}Check`,
        type: ApplyPluginsType.add,
      })) as ruleResItem[];
      sort(webToolsRes)
        .filter(Boolean)
        .forEach((i, index) => {
          switch (i.doctorLevel) {
            case "success":
              console.log(
                `${chalk.green("pass🎉🎉")}  Doctor rules ${index}: ${
                  i.label
                }\n${chalk.green("Suggestion:")}  ${i.description} \n`
              );
              break;
            case "warn":
              logger.warn(`Doctor rules: ${i.label} --  ${i.description} `);
              break;
            default:
              logger.error(`Doctor rules: ${i.label} --  ${i.description} `);
              break;
          }
        });
      if (webToolsRes.some((i) => i.doctorLevel === "error")) {
        logger.info(`${command} End`);
        (await api.applyPlugins({
          key: `addDoctor${transformString(command)}CheckEnd`,
          type: ApplyPluginsType.add,
        })) as ruleResItem[];
        process.exit(1);
      }
      //----------------- check end ------------------
      (await api.applyPlugins({
        key: `addDoctor${transformString(command)}CheckEnd`,
        type: ApplyPluginsType.add,
      })) as ruleResItem[];
    },
  });
}

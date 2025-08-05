///
/// Copyright (C) 2025 con terra GmbH (info@conterra.de)
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///         http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
///

import { MapConfigurationController } from "./controllers/MapConfigurationController";
import { ConfigurationValidationController } from "./controllers/ConfigurationValidationController";
import { LayerSortingController } from "./controllers/LayerSortingController";

import type { InjectedReference } from "apprt-core/InjectedReference";
import type { MapWidgetModel } from "map-widget/api";
import type { BundleSortingModel } from "./BundleSortingModel";
import type { LayerConfig, LayerDefinition, ValidationResult } from "./api";
import type { LogNotificationService } from "apprt/api";
import type { MessagesReference } from "./nls/bundle";

export class BundleSortingController {
    private _logService: InjectedReference<LogNotificationService>;
    private _model: InjectedReference<BundleSortingModel>;
    private _mapWidgetModel: InjectedReference<MapWidgetModel>;
    private _i18n: InjectedReference<MessagesReference>;

    activate(): void {
        this.getAppConfiguration();
    }

    private getAppConfiguration(): void {
        const model = this._model!;
        const mapWidgetModel = this._mapWidgetModel!;
        const logService = this._logService!;
        const messages = this._i18n!.get().ui;

        const mapConfigController = new MapConfigurationController(mapWidgetModel);
        mapConfigController.getMapConfiguration().then((mapConfig: LayerDefinition[]) => {
            const modelConfig = model.bundleOrderConfiguration;

            if (!modelConfig || modelConfig.length === 0) {
                console.warn("No layer configuration provided.");
                return;
            }

            const validationResult = this.validateConfiguration(modelConfig, mapConfig);

            if (!validationResult.valid) {
                console.error("Configuration validation failed:", validationResult.errors);
                logService.warn(messages.errorNotification);
                return;
            }

            const layerSortingController = new LayerSortingController(
                mapWidgetModel,
                modelConfig,
                logService,
                messages.successNotification,
                model.showRemainingBundleContents
            );
            layerSortingController.restructureLayers(modelConfig);
        });
    }

    private validateConfiguration(modelConfig: LayerConfig[], mapConfig: LayerDefinition[]): ValidationResult {
        const validator = new ConfigurationValidationController(modelConfig, mapConfig);
        return validator.validate();
    }
}

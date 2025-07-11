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


const i18n = {
    root: {
        bundleName:"Layer Sorting",
        bundleDescription: "This bundle sorts the layers in the map.",
        ui: {
            errorNotification: "Layer Sorting Configuration invalid. Please check your console for details.",
            successNotification: "Layer Sorting applied successfully."
        }
    },
    de: true
};

export type Messages = (typeof i18n)["root"];
export interface MessagesReference {
    get: () => Messages
}
export default i18n;

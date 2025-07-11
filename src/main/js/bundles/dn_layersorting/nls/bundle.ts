
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

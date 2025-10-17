# dn_layersorting

The Layer Sorting bundle allows you to reorganize and sort layers in the map according to custom configurations. This bundle enables you to change the order of layers, move layers between group layers, and control the visibility of content from domain bundles.

## Usage

1. Add the bundle "dn_layersorting" to the `allowedBundles` property in your `app.json`.
2. Configure the layer sorting rules as described in the following section.

## Configuration reference

### `Config` component

All configuration is performed on the `Config` component as shown in the following sample:

```json
{
    "dn_layersorting": {
        "Config": {
            "applicationDelay": 5000,
            "showRemainingBundleContents": {
                "domain-sample_1": true,
                "domain-sample_2": false
            },
            "bundleOrderConfiguration": [
                {
                    "id": "koeln2",
                    "order": 7
                },
                {
                    "id": "koeln1",
                    "order": 8
                },
                {
                    "id": "group2_new",
                    "order": 0,
                    "newParentId": "koeln2"
                },
                {
                    "id": "layer_domain_1",
                    "newParentId": "group2_new"
                }
            ]
        }
    }
}
```

### Available properties

| Property                    | Type   | Values | Default | Description                                                                                                                                                                                            |
|-----------------------------|--------|--------|---------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| applicationDelay            | number |        | 5000    | Delay before sorting layer. If unset defaults to 0.                                                                                                                                                    |
| showRemainingBundleContents | Object | {}     | {}      | A configuration object that controls the visibility of content from domain bundles. Each key represents a bundle ID and the boolean value determines whether the bundle's content should be displayed. |
| bundleOrderConfiguration    | Array  | []     | []      | An array of layer configuration objects that define how layers should be sorted and organized in the map.                                                                                              |

### Layer configuration objects

Each object in the `bundleOrderConfiguration` array can have the following properties:

| Property    | Type   | Required | Description                                                                                                                        |
|-------------|--------|----------|------------------------------------------------------------------------------------------------------------------------------------|
| id          | String | Yes      | The unique identifier of the layer to be configured.                                                                               |
| order       | Number | No       | The sort order for the layer. Lower numbers appear first.                                                                          |
| newParentId | String | No       | The ID of the group layer that should become the new parent of this layer. Use this to move layers between different group layers. |

### Configuration examples

#### Basic layer ordering

To change the order of layers without moving them to different groups:

```json
{
    "dn_layersorting": {
        "Config": {
            "bundleOrderConfiguration": [
                {
                    "id": "layer1",
                    "order": 1
                },
                {
                    "id": "layer2",
                    "order": 2
                },
                {
                    "id": "layer3",
                    "order": 0
                }
            ]
        }
    }
}
```

In this example, `layer3` will appear first (order 0), followed by `layer1` (order 1), and then `layer2` (order 2).

#### Moving layers to different groups

To move a layer to a different group layer:

```json
{
    "dn_layersorting": {
        "Config": {
            "bundleOrderConfiguration": [
                {
                    "id": "my_layer",
                    "newParentId": "target_group",
                    "order": 3
                }
            ]
        }
    }
}
```

This moves `my_layer` into the `target_group` group layer and sets its order to 3 within that group.

#### Creating new Groups
```json
{
    "dn_layersorting": {
        "Config": {
            "bundleOrderConfiguration": [
                {
                    "id": "new_group",
                    "order": 20,
                    "newParentId": "koeln2"
                },
                {
                    "id": "layer1",
                    "order": 1,
                    "newParentId": "new_group"
                }
            ]
        }
    }
}
```
Groups must first be created before being filled with layers.
When creating new groups "order" and "newPartentId" are optional.
"order" is required when sorting into a parent with order values. This is also valid for the root.

#### Domain bundle content control

To control which domain bundles should display their content:

```json
{
    "dn_layersorting": {
        "Config": {
            "showRemainingBundleContents": {
                "domain-bundle-1": true,
                "domain-bundle-2": false,
                "domain-bundle-3": true
            }
        }
    }
}
```

This configuration will show content from `domain-bundle-1` and `domain-bundle-3`, but hide content from `domain-bundle-2`.

## Error handling

If the layer sorting configuration contains errors (such as references to non-existent layers), the bundle will:

1. Log detailed error information to the browser console
2. Display a warning notification to the user
3. Skip applying the invalid configuration to prevent map errors

Common configuration errors include:
- Referencing layer IDs that don't exist in the map
- Circular dependencies in parent-child relationships
- Invalid data types for configuration properties

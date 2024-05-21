import { Coord3D } from '../geometry/coord3d.js';
import { RGBAColor, RGBColor } from '../model/color.js';
import { Camera, ProjectionMode } from '../viewer/camera.js';
import { EdgeSettings } from '../viewer/viewermodel.js';

// パラメータを変換するためのオブジェクト ParameterConverter を定義
export let ParameterConverter =
{
    // 整数を文字列に変換するメソッド
    IntegerToString(integer) {
        return integer.toString();
    },

    // 文字列を整数に変換するメソッド
    StringToInteger(str) {
        return parseInt(str, 10);
    },

    // 数値を文字列に変換するメソッド
    NumberToString(number) {
        let precision = 5; // 小数点以下の桁数
        return number.toFixed(precision);
    },

    // 文字列を数値に変換するメソッド
    StringToNumber(str) {
        return parseFloat(str);
    },

    // モデルのURLを文字列に変換するメソッド
    ModelUrlsToString: function (urls) {
        if (urls === null) {
            return null;
        }
        return urls.join(',');
    },

    // 文字列をモデルのURLに変換するメソッド
    StringToModelUrls: function (str) {
        if (str === null || str.length === 0) {
            return null;
        }
        return str.split(',');
    },

    // カメラのパラメータを文字列に変換するメソッド
    CameraToString: function (camera) {
        if (camera === null) {
            return null;
        }
        // カメラのパラメータをカンマ区切りの文字列に変換
        let cameraParameters = [
            this.NumberToString(camera.eye.x), this.NumberToString(camera.eye.y), this.NumberToString(camera.eye.z),
            this.NumberToString(camera.center.x), this.NumberToString(camera.center.y), this.NumberToString(camera.center.z),
            this.NumberToString(camera.up.x), this.NumberToString(camera.up.y), this.NumberToString(camera.up.z),
            this.NumberToString(camera.fov)
        ].join(',');
        return cameraParameters;
    },

    // 射影モードを文字列に変換するメソッド
    ProjectionModeToString: function (projectionMode) {
        if (projectionMode === ProjectionMode.Perspective) {
            return 'perspective';
        } else if (projectionMode === ProjectionMode.Orthographic) {
            return 'orthographic';
        }
        return null;
    },

    // 文字列をカメラに変換するメソッド
    StringToCamera: function (str) {
        if (str === null || str.length === 0) {
            return null;
        }
        let paramParts = str.split(',');
        if (paramParts.length !== 9 && paramParts.length !== 10) {
            return null;
        }

        let fieldOfView = 45.0;
        if (paramParts.length >= 10) {
            fieldOfView = this.StringToNumber(paramParts[9]);
        }

        // 文字列からカメラオブジェクトを生成して返す
        let camera = new Camera(
            new Coord3D(this.StringToNumber(paramParts[0]), this.StringToNumber(paramParts[1]), this.StringToNumber(paramParts[2])),
            new Coord3D(this.StringToNumber(paramParts[3]), this.StringToNumber(paramParts[4]), this.StringToNumber(paramParts[5])),
            new Coord3D(this.StringToNumber(paramParts[6]), this.StringToNumber(paramParts[7]), this.StringToNumber(paramParts[8])),
            fieldOfView
        );
        return camera;
    },

    // 文字列を射影モードに変換するメソッド
    StringToProjectionMode: function (str) {
        if (str === 'perspective') {
            return ProjectionMode.Perspective;
        } else if (str === 'orthographic') {
            return ProjectionMode.Orthographic;
        }
        return null;
    },

    // RGB色を文字列に変換するメソッド
    RGBColorToString: function (color) {
        if (color === null) {
            return null;
        }
        // RGB色をカンマ区切りの文字列に変換して返す
        return [
            this.IntegerToString(color.r),
            this.IntegerToString(color.g),
            this.IntegerToString(color.b)
        ].join(',');
    },

    // RGBA色を文字列に変換するメソッド
    RGBAColorToString: function (color) {
        if (color === null) {
            return null;
        }
        // RGBA色をカンマ区切りの文字列に変換して返す
        return [
            this.IntegerToString(color.r),
            this.IntegerToString(color.g),
            this.IntegerToString(color.b),
            this.IntegerToString(color.a)
        ].join(',');
    },

    // 文字列をRGB色に変換するメソッド
    StringToRGBColor: function (str) {
        if (str === null || str.length === 0) {
            return null;
        }
        let paramParts = str.split(',');
        if (paramParts.length !== 3) {
            return null;
        }
        // カンマ区切りの文字列からRGB色オブジェクトを生成して返す
        return new RGBColor(
            this.StringToInteger(paramParts[0]),
            this.StringToInteger(paramParts[1]),
            this.StringToInteger(paramParts[2])
        );
    },

    // 文字列をRGBA色に変換するメソッド
    StringToRGBAColor: function (str) {
        if (str === null || str.length === 0) {
            return null;
        }
        let paramParts = str.split(',');
        if (paramParts.length !== 3 && paramParts.length !== 4) {
            return null;
        }
        let color = new RGBAColor(
            this.StringToInteger(paramParts[0]),
            this.StringToInteger(paramParts[1]),
            this.StringToInteger(paramParts[2]),
            255
        );
        if (paramParts.length === 4
        ) {
            color.a = this.StringToInteger(paramParts[3]);
        }
        return color;
    },

    // 環境設定を文字列に変換するメソッド
    EnvironmentSettingsToString(environmentSettings) {
        if (environmentSettings === null) {
            return null;
        }
        // 環境設定をカンマ区切りの文字列に変換して返す
        let environmentSettingsParameters = [
            environmentSettings.environmentMapName,
            environmentSettings.backgroundIsEnvMap ? 'on' : 'off'
        ].join(',');
        return environmentSettingsParameters;
    },

    // 文字列を環境設定に変換するメソッド
    StringToEnvironmentSettings: function (str) {
        if (str === null || str.length === 0) {
            return null;
        }
        let paramParts = str.split(',');
        if (paramParts.length !== 2) {
            return null;
        }
        // カンマ区切りの文字列から環境設定オブジェクトを生成して返す
        let environmentSettings = {
            environmentMapName: paramParts[0],
            backgroundIsEnvMap: paramParts[1] === 'on' ? true : false
        };
        return environmentSettings;
    },

    // エッジ設定を文字列に変換するメソッド
    EdgeSettingsToString: function (edgeSettings) {
        if (edgeSettings === null) {
            return null;
        }
        // エッジ設定をカンマ区切りの文字列に変換して返す
        let edgeSettingsParameters = [
            edgeSettings.showEdges ? 'on' : 'off',
            this.RGBColorToString(edgeSettings.edgeColor),
            this.IntegerToString(edgeSettings.edgeThreshold),
        ].join(',');
        return edgeSettingsParameters;
    },

    // 文字列をエッジ設定に変換するメソッド
    StringToEdgeSettings: function (str) {
        if (str === null || str.length === 0) {
            return null;
        }
        let paramParts = str.split(',');
        if (paramParts.length !== 5) {
            return null;
        }
        // カンマ区切りの文字列からエッジ設定オブジェクトを生成して返す
        let edgeSettings = new EdgeSettings(
            paramParts[0] === 'on' ? true : false,
            new RGBColor(
                this.StringToInteger(paramParts[1]),
                this.StringToInteger(paramParts[2]),
                this.StringToInteger(paramParts[3])
            ),
            this.StringToInteger(paramParts[4])
        );
        return edgeSettings;
    }
};

export class ParameterListBuilder {
    constructor(separator) {
        this.separator = separator;
        this.paramList = '';
    }

    AddModelUrls(urls) {
        this.AddUrlPart('model', ParameterConverter.ModelUrlsToString(urls));
        return this;
    }

    AddCamera(camera) {
        this.AddUrlPart('camera', ParameterConverter.CameraToString(camera));
        return this;
    }

    AddProjectionMode(projectionMode) {
        this.AddUrlPart('projectionmode', ParameterConverter.ProjectionModeToString(projectionMode));
        return this;
    }

    AddEnvironmentSettings(envSettings) {
        this.AddUrlPart('envsettings', ParameterConverter.EnvironmentSettingsToString(envSettings));
        return this;
    }

    AddBackgroundColor(background) {
        this.AddUrlPart('backgroundcolor', ParameterConverter.RGBAColorToString(background));
        return this;
    }

    AddDefaultColor(color) {
        this.AddUrlPart('defaultcolor', ParameterConverter.RGBColorToString(color));
        return this;
    }

    AddDefaultLineColor(color) {
        this.AddUrlPart('defaultlinecolor', ParameterConverter.RGBColorToString(color));
        return this;
    }

    AddEdgeSettings(edgeSettings) {
        this.AddUrlPart('edgesettings', ParameterConverter.EdgeSettingsToString(edgeSettings));
        return this;
    }

    AddUrlPart(keyword, urlPart) {
        if (keyword === null || urlPart === null) {
            return;
        }
        if (this.paramList.length > 0) {
            this.paramList += this.separator;
        }
        this.paramList += keyword + '=' + urlPart;
    }

    GetParameterList() {
        return this.paramList;
    }
}

export class ParameterListParser {
    constructor(paramList, separator) {
        this.separator = separator;
        this.paramList = paramList;
    }

    GetModelUrls() {
        // detect legacy links
        if (this.paramList.indexOf('=') === -1) {
            return this.paramList.split(',');
        }

        let keywordParams = this.GetKeywordParams('model');
        return ParameterConverter.StringToModelUrls(keywordParams);
    }

    GetCamera() {
        let keywordParams = this.GetKeywordParams('camera');
        return ParameterConverter.StringToCamera(keywordParams);
    }

    GetProjectionMode() {
        let keywordParams = this.GetKeywordParams('cameramode'); // for compatibility
        if (keywordParams === null) {
            keywordParams = this.GetKeywordParams('projectionmode');
        }
        return ParameterConverter.StringToProjectionMode(keywordParams);
    }

    GetEnvironmentSettings() {
        let environmentSettingsParams = this.GetKeywordParams('envsettings');
        return ParameterConverter.StringToEnvironmentSettings(environmentSettingsParams);
    }

    GetBackgroundColor() {
        let backgroundParams = this.GetKeywordParams('backgroundcolor');
        return ParameterConverter.StringToRGBAColor(backgroundParams);
    }

    GetDefaultColor() {
        let colorParams = this.GetKeywordParams('defaultcolor');
        return ParameterConverter.StringToRGBColor(colorParams);
    }

    GetDefaultLineColor() {
        let colorParams = this.GetKeywordParams('defaultlinecolor');
        return ParameterConverter.StringToRGBColor(colorParams);
    }

    GetEdgeSettings() {
        let edgeSettingsParams = this.GetKeywordParams('edgesettings');
        return ParameterConverter.StringToEdgeSettings(edgeSettingsParams);
    }

    GetKeywordParams(keyword) {
        if (this.paramList === null || this.paramList.length === 0) {
            return null;
        }
        let keywordToken = keyword + '=';
        let urlParts = this.paramList.split(this.separator);
        for (let i = 0; i < urlParts.length; i++) {
            let urlPart = urlParts[i];
            if (urlPart.startsWith(keywordToken)) {
                return urlPart.substring(keywordToken.length);
            }
        }
        return null;
    }
}

export function CreateUrlBuilder() {
    return new ParameterListBuilder('$');
}

export function CreateUrlParser(urlParams) {
    return new ParameterListParser(urlParams, '$');
}

export function CreateModelUrlParameters(urls) {
    let builder = CreateUrlBuilder();
    builder.AddModelUrls(urls);
    return builder.GetParameterList();
}

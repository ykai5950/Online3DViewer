import { CoordIsEqual3D } from '../geometry/coord3d.js';
import { IsEqual } from '../geometry/geometry.js';

/**
 * カメラのナビゲーションモード。
 * @enum
 */
export const NavigationMode =
{
    /** 固定の上方ベクトル。 */
    FixedUpVector: 1,
    /** 自由な軌道。 */
    FreeOrbit: 2
};

/**
 * カメラの投影モード。
 * @enum
 */
export const ProjectionMode =
{
    /** 透視投影。 */
    Perspective: 1,
    /** 正射影。 */
    Orthographic: 2
};

/**
 * カメラオブジェクト。
 */
export class Camera {
    /**
     * @param {Coord3D} eye カメラの位置。
     * @param {Coord3D} center 中心位置。場合によってはターゲットまたは見る位置と呼ばれることもあります。
     * @param {Coord3D} up 上方ベクトル。
     * @param {number} fov 視野角（度）。
     */
    constructor(eye, center, up, fov) {
        this.eye = eye;
        this.center = center;
        this.up = up;
        this.fov = fov;
    }

    /**
     * オブジェクトのクローンを作成します。
     * @returns {Camera}
     */
    Clone() {
        return new Camera(
            this.eye.Clone(),
            this.center.Clone(),
            this.up.Clone(),
            this.fov
        );
    }
}

/**
 * 2つのカメラが等しいかどうかを判定します。
 * @param {Camera} a カメラA。
 * @param {Camera} b カメラB。
 * @returns {boolean} カメラが等しい場合はtrue、それ以外の場合はfalse。
 */
export function CameraIsEqual3D(a, b) {
    return CoordIsEqual3D(a.eye, b.eye) && CoordIsEqual3D(a.center, b.center) && CoordIsEqual3D(a.up, b.up) && IsEqual(a.fov, b.fov);
}

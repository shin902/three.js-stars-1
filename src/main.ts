import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Config } from './config';

// 球状分布のためのヘルパー関数
const getRandomSphericalPosition = (radius: number): THREE.Vector3 => {
  const u = Math.random(); // 0から1の乱数
  const v = Math.random(); // 0から1の乱数
  const theta = 2 * Math.PI * u; // 経度 (0から2π)
  const phi = Math.acos(2 * v - 1); // 緯度 (0からπ)
  // 立方根を使用して半径方向に均一な分布を生成
  const r = radius * Math.cbrt(Math.random());

  // 球座標から直交座標へ変換
  const x = r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.sin(phi) * Math.sin(theta);
  const z = r * Math.cos(phi);

  return new THREE.Vector3(x, y, z); // 3Dベクトルとして位置を返す
};

// 星空を管理するクラス
class StarField {
  private starGroup: THREE.Group; // 星をまとめるグループ
  private BRIGHT_STAR_COUNT = 20; // 明るい星の数
  private BRIGHT_STAR_GEOMETRY_SIZE = 0.2; // 明るい星のジオメトリサイズ

  // コンストラクタ
  constructor(
    private scene: THREE.Scene, // シーンオブジェクト
    private STAR_COUNT = 15000, // 星の総数
    private STAR_RADIUS = 200, // 星が分布する半径
    private STAR_GEOMETRY_SIZE = 0.1 // 通常の星のジオメトリサイズ
  ) {
    this.starGroup = new THREE.Group(); // 星グループを初期化
    this.createStars(); // 星を生成するメソッドを呼び出す
  }

  // 星を生成するメソッド
  private createStars() {
    // 星のジオメトリ（球体）を作成。セグメント数を増やして滑らかに
    const starGeometry = new THREE.SphereGeometry(this.STAR_GEOMETRY_SIZE, 80, 80);
    const color = new THREE.Color(); // 色オブジェクト

    // 指定された数の星を生成
    for (let i = 0; i < this.STAR_COUNT; i++) {
      // ランダムな球状の位置を取得
      const position = getRandomSphericalPosition(this.STAR_RADIUS);

      // 青紫系のランダムな色を生成
      const hue = Math.random() * 0.1 + 0.6; // 色相 (0.6-0.7)
      const saturation = Math.random() * 0.3 + 0.7; // 彩度 (0.7-1.0)
      const lightness = Math.random() * 0.4 + 0.6; // 明度 (0.6-1.0)
      color.setHSL(hue, saturation, lightness); // HSLで色を設定

      // 星のマテリアル（基本的なメッシュマテリアル）
      const starMaterial = new THREE.MeshBasicMaterial({
        color: color.getHex(), // 16進数で色を指定
      });

      // 星のメッシュを作成
      const star = new THREE.Mesh(starGeometry, starMaterial);
      star.position.copy(position); // 計算した位置を設定
      this.starGroup.add(star); // 星グループに追加
    }

    // 明るい星を生成（光源を持つ）
    // 明るい星のジオメトリ（球体）。セグメント数を増やして滑らかに
    const brightStarGeometry = new THREE.SphereGeometry(this.BRIGHT_STAR_GEOMETRY_SIZE, 32, 32);
    for (let i = 0; i < this.BRIGHT_STAR_COUNT; i++) {
      // ランダムな球状の位置を取得（少し内側）
      const position = getRandomSphericalPosition(this.STAR_RADIUS);

      // 明るい星のマテリアル（半透明で明るい色）
      const brightStarMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(Math.random() * 0.1 + 0.6, 0.9, 0.9), // 明るい青紫系の色
        transparent: true, // 透明度を有効化
        opacity: 2, // 不透明度（1以上で発光効果）
      });

      // 明るい星のメッシュを作成
      const brightStar = new THREE.Mesh(brightStarGeometry, brightStarMaterial);
      brightStar.position.copy(position); // 計算した位置を設定
      this.scene.add(brightStar); // シーンに直接追加（グループ化しない）
    }

    this.scene.add(this.starGroup); // 通常の星のグループをシーンに追加
  }

  // 星のアニメーションメソッド
  public animate() {
    // Y軸周りにゆっくり回転させる
    this.starGroup.rotation.y += 0.0005;
  }
}

// ヘルパー関数: 星雲パーティクル用のテクスチャを作成
const createNebulaTexture = (): THREE.CanvasTexture => {
  const size = 128; // テクスチャのサイズ
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d')!;

  const gradient = context.createRadialGradient(
    size / 2, // 中心X
    size / 2, // 中心Y
    0,        // 開始半径
    size / 2, // 中心X
    size / 2, // 中心Y
    size / 2  // 終了半径
  );
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');   // 中心は白、不透明
  gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)'); // 少し外側
  gradient.addColorStop(0.4, 'rgba(200, 200, 255, 0.4)'); // さらに外側 (少し青みがかる)
  gradient.addColorStop(1, 'rgba(150, 150, 255, 0)');   // 端は透明

  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true; // テクスチャの更新を通知
  return texture;
};


// 星雲を管理するクラス
class NebulaManager {
  private nebulaGroup: THREE.Group; // 星雲をまとめるグループ
  private nebulaTexture: THREE.CanvasTexture; // 星雲パーティクル用テクスチャ
  private NEBULA_BASE_SIZE = 10; // 星雲の基本サイズ
  private NEBULA_SIZE_VARIATION = 20; // 星雲のサイズのばらつき
  private NEBULA_OPACITY = 0.1; // 星雲の不透明度
  private nebulaRotation = 0; // 星雲の現在の回転角度

  // コンストラクタ
  constructor(
    private scene: THREE.Scene, // シーンオブジェクト
    private NEBULA_COUNT = 5, // 生成する星雲の数
    private NEBULA_PARTICLE_COUNT = 1000 // 各星雲のパーティクル数
  ) {
    this.nebulaGroup = new THREE.Group(); // 星雲グループを初期化
    this.nebulaTexture = createNebulaTexture(); // 星雲テクスチャを作成
    this.createNebulae(); // 星雲を生成するメソッドを呼び出す
  }

  // 星雲を生成するメソッド
  private createNebulae() {
    // 指定された数の星雲を生成
    for (let i = 0; i < this.NEBULA_COUNT; i++) {
      const nebulaGeometry = new THREE.BufferGeometry(); // 星雲のジオメトリ（バッファジオメトリ）
      // パーティクルの位置と色情報を格納する配列
      const positions = new Float32Array(this.NEBULA_PARTICLE_COUNT * 3); // 各パーティクルにx, y, z
      const colors = new Float32Array(this.NEBULA_PARTICLE_COUNT * 3); // 各パーティクルにr, g, b

      // 星雲の中心位置をランダムに決定
      const centerX = (Math.random() - 0.5) * 100;
      const centerY = (Math.random() - 0.5) * 100;
      const centerZ = (Math.random() - 0.5) * 100;

      // 星雲のサイズをランダムに決定
      const size = Math.random() * this.NEBULA_SIZE_VARIATION + this.NEBULA_BASE_SIZE;

      // 星雲の色（青紫系）をランダムに決定
      const hue = Math.random() * 0.3 + 0.6; // 色相 (0.6-0.9)
      const color = new THREE.Color(); // 色オブジェクト

      // 各パーティクルの位置と色を設定
      for (let j = 0; j < this.NEBULA_PARTICLE_COUNT; j++) {
        // 球状分布でパーティクルの位置を決定
        // Math.powを使用して中心付近の密度を高める
        const radius = size * Math.pow(Math.random(), 0.5);
        const theta = Math.random() * Math.PI * 2; // 経度 (0から2π)
        const phi = Math.acos(2 * Math.random() - 1); // 緯度 (0からπ)

        // 球座標から直交座標へ変換し、中心位置をオフセット
        const x = centerX + radius * Math.sin(phi) * Math.cos(theta);
        const y = centerY + radius * Math.sin(phi) * Math.sin(theta);
        const z = centerZ + radius * Math.cos(phi);

        // 位置情報を配列に格納
        positions[j * 3] = x;
        positions[j * 3 + 1] = y;
        positions[j * 3 + 2] = z;

        // 中心からの距離に基づいて彩度を決定（中心に近いほど彩度が高い）
        const distance = Math.sqrt(
          Math.pow(x - centerX, 2) +
          Math.pow(y - centerY, 2) +
          Math.pow(z - centerZ, 2)
        );
        const saturation = Math.max(0, 1 - distance / (size * 0.5)); // 彩度 (0-1)
        const lightness = Math.random() * 0.2 + 0.4; // 明度 (0.4-0.6)

        // HSLで色を設定し、RGB値を配列に格納
        color.setHSL(hue, saturation, lightness);
        colors[j * 3] = color.r;
        colors[j * 3 + 1] = color.g;
        colors[j * 3 + 2] = color.b;
      }

      // ジオメトリに位置と色の属性を設定
      nebulaGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      nebulaGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      // 星雲のマテリアル（ポイントマテリアル）
      const nebulaMaterial = new THREE.PointsMaterial({
        size: 2, // パーティクルのサイズを調整 (テクスチャ適用のため少し大きく)
        map: this.nebulaTexture, // 作成した円形テクスチャを適用
        transparent: true, // 透明度を有効化
        opacity: this.NEBULA_OPACITY, // 不透明度
        vertexColors: true, // 頂点カラーを有効化
        blending: THREE.AdditiveBlending, // 加算ブレンドで発光効果
        depthWrite: false // デプス書き込みを無効化 (ブレンディング時のアーティファクト防止)
      });

      // 星雲のポイントオブジェクトを作成
      const nebula = new THREE.Points(nebulaGeometry, nebulaMaterial);
      this.nebulaGroup.add(nebula); // 星雲グループに追加
    }

    this.scene.add(this.nebulaGroup); // 星雲グループをシーンに追加
  }

  // 星雲のアニメーションメソッド
  public animate() {
    this.nebulaRotation += Config.NEBULA_ROTATION_SPEED; // 回転角度を更新
    this.nebulaGroup.rotation.y = this.nebulaRotation; // Y軸周りに回転
  }
}

// 流れ星を管理するクラス
class ShootingStarManager {
  private scene: THREE.Scene;
  private shootingStars: THREE.Line[] = []; // 流れ星の配列
  private SHOOTING_STAR_SPEED = 5; // 流れ星の速度
  private SHOOTING_STAR_LIFESPAN = 100; // 流れ星の寿命（フレーム数）
  private SHOOTING_STAR_CREATION_PROBABILITY = 0.05; // 流れ星の生成確率

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  // 流れ星を生成するメソッド
  private createShootingStar() {
    // 開始位置をランダムに決定 (画面外周付近)
    const radius = 300; // 星空より少し外側
    const startPos = getRandomSphericalPosition(radius);

    // 移動方向をランダムに決定 (中心方向へ向かうように調整)
    const direction = startPos.clone().negate().normalize(); // 中心へ向かうベクトル
    // ランダムな微小なずれを加える
    direction.x += (Math.random() - 0.5) * 0.5;
    direction.y += (Math.random() - 0.5) * 0.5;
    direction.z += (Math.random() - 0.5) * 0.5;
    direction.normalize();

    // 終了位置を計算 (開始位置 + 方向 * 長さ)
    const length = 10 + Math.random() * 10; // 流れ星の長さ
    const endPos = startPos.clone().add(direction.clone().multiplyScalar(length));

    // ジオメトリを作成
    const geometry = new THREE.BufferGeometry().setFromPoints([startPos, endPos]);

    // マテリアルを作成 (白く明るい線)
    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      linewidth: 1, // linewidth は非推奨だが、簡単な線には使える
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending, // 加算ブレンドで明るく見せる
    });

    // 線オブジェクトを作成
    const shootingStar = new THREE.Line(geometry, material);

    // カスタムデータを追加
    shootingStar.userData = {
      direction: direction,
      speed: this.SHOOTING_STAR_SPEED * (0.8 + Math.random() * 0.4), // 速度にばらつきを持たせる
      lifespan: this.SHOOTING_STAR_LIFESPAN * (0.8 + Math.random() * 0.4), // 寿命にばらつき
      age: 0,
    };

    this.scene.add(shootingStar);
    this.shootingStars.push(shootingStar);
  }

  // 流れ星のアニメーションメソッド
  public animate() {
    // 一定確率で新しい流れ星を生成
    if (Math.random() < this.SHOOTING_STAR_CREATION_PROBABILITY) {
      this.createShootingStar();
    }

    // 既存の流れ星を更新・削除
    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const star = this.shootingStars[i];
      const data = star.userData;

      // 位置を更新
      const moveVector = data.direction.clone().multiplyScalar(data.speed);
      star.position.add(moveVector);

      // 年齢を更新
      data.age++;

      // 寿命が尽きたら削除
      if (data.age > data.lifespan) {
        this.scene.remove(star);
        // geometryとmaterialも破棄
        star.geometry.dispose();
        (star.material as THREE.Material).dispose();
        this.shootingStars.splice(i, 1);
      } else {
        // 徐々に透明にする (オプション)
        // (star.material as THREE.LineBasicMaterial).opacity = 0.8 * (1 - data.age / data.lifespan);
      }
    }
  }
}


// 夜空全体を管理するメインクラス
class NightSky {
  private scene: THREE.Scene; // 3Dシーン
  private camera: THREE.PerspectiveCamera; // カメラ
  private renderer: THREE.WebGLRenderer; // レンダラー
  private controls: OrbitControls; // カメラコントロール
  private starField: StarField; // 星空マネージャー
  private nebulaManager: NebulaManager; // 星雲マネージャー
  private shootingStarManager: ShootingStarManager; // 流れ星マネージャー

  // コンストラクタ
  constructor() {
    // HTML要素のセットアップ
    const app = document.querySelector<HTMLDivElement>('#app')!; // #app要素を取得
    app.innerHTML = ''; // 中身をクリア

    // シーンのセットアップ
    this.scene = new THREE.Scene(); // 新しいシーンを作成
    this.scene.background = new THREE.Color(Config.SCENE_BACKGROUND_COLOR); // 背景色を設定

    // カメラのセットアップ
    this.camera = new THREE.PerspectiveCamera(
      Config.CAMERA_FOV, // 視野角
      window.innerWidth / window.innerHeight, // アスペクト比
      Config.CAMERA_NEAR, // 近クリップ面
      Config.CAMERA_FAR // 遠クリップ面
    );
    this.camera.position.z = Config.CAMERA_INITIAL_Z; // カメラの初期Z位置を設定

    // レンダラーのセットアップ
    this.renderer = new THREE.WebGLRenderer({ antialias: true }); // アンチエイリアス有効
    this.renderer.setSize(window.innerWidth, window.innerHeight); // レンダラーのサイズをウィンドウに合わせる
    this.renderer.setPixelRatio(window.devicePixelRatio); // デバイスのピクセル比を設定
    app.appendChild(this.renderer.domElement); // レンダラーのDOM要素を#appに追加

    // カメラコントロールのセットアップ
    this.controls = new OrbitControls(this.camera, this.renderer.domElement); // OrbitControlsを作成
    this.controls.enableDamping = true; // ダンピング（慣性）を有効化
    this.controls.dampingFactor = 0.05; // ダンピング係数
    this.controls.rotateSpeed = 0.5; // 回転速度
    this.controls.autoRotate = false; // 自動回転を無効化
    this.controls.autoRotateSpeed = 0.5; // 自動回転速度
    this.controls.enableZoom = false; // ズームを無効化
    this.controls.enablePan = false; // パン（平行移動）を無効化
    this.controls.enabled = false; // カメラコントロール全体を無効化

    // シーン要素の作成
    this.starField = new StarField(this.scene); // 星空を作成
    this.nebulaManager = new NebulaManager(this.scene); // 星雲を作成
    this.shootingStarManager = new ShootingStarManager(this.scene); // 流れ星マネージャーを作成

    // イベントリスナーの設定
    window.addEventListener('resize', this.handleResize); // ウィンドウリサイズ時の処理

    // アニメーションループを開始
    this.animate();
  }

  // ウィンドウリサイズ時の処理
  private handleResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight; // カメラのアスペクト比を更新
    this.camera.updateProjectionMatrix(); // カメラの投影行列を更新
    this.renderer.setSize(window.innerWidth, window.innerHeight); // レンダラーのサイズを更新
  };

  // アニメーションループ
  private animate = () => {
    requestAnimationFrame(this.animate); // 次のフレームで再度animateを呼び出す

    // コントロールを更新 (enabled = false のため、実質的には何もしないが、形式上残す)
    // this.controls.update(); // コメントアウトまたは削除

    // シーン要素のアニメーションを更新
    this.starField.animate(); // 星をアニメーションさせる
    this.nebulaManager.animate(); // 星雲をアニメーションさせる
    this.shootingStarManager.animate(); // 流れ星をアニメーションさせる

    // シーンをレンダリング
    this.renderer.render(this.scene, this.camera);
  };
}

// NightSkyクラスのインスタンスを作成して初期化
new NightSky();

import * as THREE from 'three';

// 明るい星を管理するクラス
export class BrightStarManager {
  private scene: THREE.Scene;
  private brightStars: THREE.Mesh[] = [];
  private BRIGHT_STAR_COUNT = 20; // 明るい星の数
  private BRIGHT_STAR_GEOMETRY_SIZE = 0.2; // 明るい星のジオメトリサイズ
  private STAR_RADIUS = 200; // 星が分布する半径

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createBrightStars();
  }

  private getRandomSphericalPosition(radius: number): THREE.Vector3 {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = radius * Math.cbrt(Math.random());

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    return new THREE.Vector3(x, y, z);
  }

  private createBrightStars() {
    const brightStarGeometry = new THREE.SphereGeometry(this.BRIGHT_STAR_GEOMETRY_SIZE, 32, 32);
    for (let i = 0; i < this.BRIGHT_STAR_COUNT; i++) {
      const position = this.getRandomSphericalPosition(this.STAR_RADIUS);

      const brightStarMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(Math.random() * 0.1 + 0.6, 0.9, 0.9),
        transparent: true,
        opacity: 2,
      });

      const brightStar = new THREE.Mesh(brightStarGeometry, brightStarMaterial);
      brightStar.position.copy(position);
      this.scene.add(brightStar);
      this.brightStars.push(brightStar);
    }
  }

  public animate() {
    // 明るい星のアニメーション（必要に応じて）
  }
}

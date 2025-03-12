/**
 * ItemGenerator - アイテム自動生成システム
 * 
 * 概要:
 * このスクリプトは、指定された位置で定期的にアイテムを生成するシステムを実装します。
 * 
 * 主な機能:
 * 1. ジェネレーターの設定
 *    - トライアルキーを使用してジェネレーターを設定
 *    - 生成間隔、アイテムの種類、生成数を設定可能
 * 
 * 2. アイテムの生成
 *    - 設定された間隔でアイテムを自動生成
 *    - 無効なアイテムの生成防止
 *    - 複数ディメンションでの動作対応
 * 
 * 3. 管理機能
 *    - クリエイティブモードでの設定削除
 *    - ジェネレーターブロックの破壊防止
 *    - バリアブロックとアーマースタンドによる位置管理
 * 
 * 使用方法:
 * 1. 設定: トライアルキーで対象ブロックを使用
 * 2. 設定変更: 再度トライアルキーで使用
 * 3. 削除: クリエイティブモードでブロックを破壊
 * 
 * 技術的な詳細:
 * - 位置管理: バリアブロックとアーマースタンドを使用
 * - データ保持: エンティティタグを使用
 * - イベント処理: beforeEvents, afterEventsを使用
 * - 座標オフセット: 99ブロック上空にバリアブロックを設置
 * 
 * @version 1.0.0
 * @license MIT
 */

import { world, system, ItemStack, GameMode } from '@minecraft/server';
import { ModalFormData } from '@minecraft/server-ui';

/**
 * システム全体で使用する定数値の定義
 * @constant {Object} CONSTANTS
 */
const CONSTANTS = {
    /** ジェネレーターが動作可能なディメンションの一覧 */
    DIMENSIONS: ["minecraft:nether", "minecraft:overworld", "minecraft:the_end"],
    /** フォームのデフォルト値設定 */
    DEFAULT_TICKS: "200",        // デフォルトの生成間隔（tick）
    DEFAULT_ITEM_ID: "minecraft:diamond",  // デフォルトの生成アイテム
    DEFAULT_ITEM_COUNT: "1",     // デフォルトの生成数
    /** ブロックの配置オフセット */
    BARRIER_OFFSET: 99,          // バリアブロックの配置高さ
    ITEM_SPAWN_OFFSET: 98        // アイテム生成位置の高さ
};

/**
 * ジェネレーターの設定を管理するクラス
 * @class
 */
class GeneratorSettings {
    /**
     * ジェネレーター設定のコンストラクタ
     * @param {string} ticks - 生成間隔（tick）
     * @param {string} itemId - 生成するアイテムのID
     * @param {string} itemCount - 生成するアイテムの数
     */
    constructor(ticks, itemId, itemCount) {
        this.ticks = parseInt(ticks);
        this.itemId = itemId;
        this.itemCount = parseInt(itemCount);
    }

    /**
     * フォームの値から設定オブジェクトを生成する
     * @param {Array} formValues - フォームから取得した値の配列
     * @returns {GeneratorSettings} 生成された設定オブジェクト
     */
    static fromFormValues(formValues) {
        return new GeneratorSettings(formValues[0], formValues[1], formValues[2]);
    }

    /**
     * 設定値の妥当性を検証する
     * @returns {boolean} 設定値が有効な場合はtrue
     */
    validate() {
        return !isNaN(this.ticks) &&
               typeof this.itemId === "string" && this.itemId.startsWith("minecraft:") &&
               !isNaN(this.itemCount);
    }
}

/**
 * ジェネレーター設定用のモーダルフォームを表示し、設定を処理する
 * @param {Player} player - 設定を行うプレイヤー
 * @param {Block} block - 設定対象のブロック
 * @returns {Promise<void>}
 */
async function showSettingModal(player, block) {
    try {
        const modalForm = new ModalFormData()
            .title('Generator Settings')
            .textField('生成時間（tick）', '整数を入力', CONSTANTS.DEFAULT_TICKS)
            .textField('生成アイテムID', '', CONSTANTS.DEFAULT_ITEM_ID)
            .textField('生成アイテム数', '', CONSTANTS.DEFAULT_ITEM_COUNT);
        
        const formData = await modalForm.show(player);
        const settings = GeneratorSettings.fromFormValues(formData.formValues);

        if (!settings.validate()) {
            player.sendMessage('§4入力値が不正です');
            return;
        }

        setUpArmorStand(block, settings);
    } catch (error) {
        player.sendMessage('§4フォームの表示に失敗しました: ' + error);
    }
}

/**
 * ジェネレーターのアーマースタンドを設置する
 * @param {Block} block - 設置対象のブロック
 * @param {GeneratorSettings} settings - ジェネレーターの設定
 */
function setUpArmorStand(block, settings) {
    const dimension = block.dimension;
    const pos = { ...block.location };
    const basePos = { ...block.location };

    pos.y += CONSTANTS.BARRIER_OFFSET;
    dimension.setBlockType(pos, "minecraft:barrier");
    
    pos.x += 0.5; pos.y += 1; pos.z += 0.5;
    const armorStand = dimension.spawnEntity("minecraft:armor_stand", pos);
    
    armorStand.nameTag = String(settings.ticks);
    armorStand.addTag(`gen:${settings.ticks},${settings.itemId},${settings.itemCount},${basePos.x},${basePos.y},${basePos.z}`);
}

/**
 * 無効なジェネレーターを削除する
 * @param {Dimension} dimension - ジェネレーターが存在するディメンション
 * @param {Vector3} pos - ジェネレーターの位置
 * @param {Entity} armorStand - ジェネレーターのアーマースタンド
 */
function removeInvalidGenerator(dimension, pos, armorStand) {
    pos.y += CONSTANTS.BARRIER_OFFSET;
    dimension.setBlockType(pos, "minecraft:air");
    armorStand.kill();
    world.sendMessage('§4無効なジェネレーターが削除されました。');
}

/**
 * ジェネレーターのエンティティを処理する
 * @param {Entity} entity - 処理対象のエンティティ
 * @param {Dimension} dimension - エンティティが存在するディメンション
 * @param {string} tag - エンティティのジェネレータータグ
 */
function processEntity(entity, dimension, tag) {
    const values = tag.replace("gen:", "").split(",");
    entity.addEffect("invisibility", 20, { showParticles: false });

    const entityPos = { ...entity.location };
    entityPos.y -= CONSTANTS.BARRIER_OFFSET + 1;
    
    if (dimension.getBlock(entityPos).typeId === "minecraft:air") {
        entityPos.y += CONSTANTS.BARRIER_OFFSET;
        dimension.setBlockType(entityPos, "minecraft:air");
        entity.kill();
        world.sendMessage('§gジェネレーターブロックが存在しないため削除されました');
        return;
    }

    if (!entity.hasTag("count_initialized")) {
        entity.nameTag = values[0];
        entity.addTag("count_initialized");
    }

    let count = parseInt(entity.nameTag);
    if (!isNaN(count)) {
        count -= 1;
        if (count <= 0) {
            count = parseInt(values[0]);
            const pos = { ...entity.location, y: entity.location.y - CONSTANTS.ITEM_SPAWN_OFFSET };

            try {
                const itemStack = new ItemStack(values[1], parseInt(values[2]));
                dimension.spawnItem(itemStack, pos);
            } catch (e) {
                removeInvalidGenerator(dimension, entity.location, entity);
                world.sendMessage('§4無効なアイテムの生成が試みられたため、ジェネレーターが削除されました');
                return;
            }
        }
        entity.nameTag = String(count);
    } else {
        entity.nameTag = values[0];
    }
}

// メインループの設定
system.runInterval(() => {
    const entitiesWithGenTag = [];

    for (const dimensionName of CONSTANTS.DIMENSIONS) {
        const dimension = world.getDimension(dimensionName);
        const entities = dimension.getEntities();

        for (const entity of entities) {
            for (const tag of entity.getTags()) {
                if (tag.startsWith("gen:")) {
                    entitiesWithGenTag.push({ entity, dimension, tag });
                    break;
                }
            }
        }
    }

    entitiesWithGenTag.forEach(({ entity, dimension, tag }) => processEntity(entity, dimension, tag));
}, 1);

// ブロック破壊イベントの処理
world.beforeEvents.playerBreakBlock.subscribe(ev => {
    const player = ev.player;
    const block = ev.block;
    const pos = { ...block.location };
    const dimension = block.dimension;

    const barrierPos = { ...pos };
    barrierPos.y += CONSTANTS.BARRIER_OFFSET;
    const barrierBlock = dimension.getBlock(barrierPos);

    if (barrierBlock.typeId === "minecraft:barrier") {
        const armorStandPos = { ...barrierPos };
        armorStandPos.y += 1;

        const entities = dimension.getEntities();
        let isGenerator = false;

        for (const entity of entities) {
            if (entity.typeId === "minecraft:armor_stand" && 
                entity.getTags().some(tag => tag.startsWith("gen:"))) {
                
                const entityPos = entity.location;
                if (Math.floor(entityPos.x) === Math.floor(armorStandPos.x) &&
                    Math.floor(entityPos.y) === Math.floor(armorStandPos.y) &&
                    Math.floor(entityPos.z) === Math.floor(armorStandPos.z)) {
                    isGenerator = true;
                    break;
                }
            }
        }

        if (isGenerator && player.getGameMode() !== GameMode.creative) {
            ev.cancel = true;
            player.sendMessage('§gジェネレーターは§aクリエイティブモード§gでのみ破壊できます。');
        }
    }
});

// アイテム使用イベントの処理
world.afterEvents.itemUse.subscribe(ev => {
    const player = ev.source;
    const item = ev.itemStack;
    const block = player.getBlockFromViewDirection().block;

    if (item.typeId === "minecraft:trial_key" && !player.isSneaking) {
        showSettingModal(player, block);
        ev.cancel = true;
    }
});

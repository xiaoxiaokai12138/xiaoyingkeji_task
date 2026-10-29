package studio.yingzuo.task;

public enum Stage {
    ASSET_CHECK, GENERATE, FINALIZE;
    public String label() { return switch(this) { case ASSET_CHECK -> "素材检查"; case GENERATE -> "模拟生成"; case FINALIZE -> "结果整理"; }; }
}

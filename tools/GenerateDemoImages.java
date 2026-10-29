import java.awt.*;
import java.awt.image.BufferedImage;
import java.nio.file.*;
import javax.imageio.ImageIO;

/** Original, deterministic upload fixtures. Run with Java 21 source-file mode. */
class GenerateDemoImages {
    public static void main(String[] args) throws Exception {
        Path directory = Path.of(args[0]); Files.createDirectories(directory);
        for (int variant = 0; variant < 2; variant++) {
            BufferedImage image = new BufferedImage(640, 480, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = image.createGraphics();
            g.setColor(new Color(variant == 0 ? 0xC8DFDA : 0xD8BFB4)); g.fillRect(0, 0, 640, 480);
            g.setColor(new Color(0xF4DEAC)); g.fillOval(410, 60, 120, 120);
            g.setColor(new Color(variant == 0 ? 0x597D78 : 0x766B88));
            g.fillPolygon(new int[]{0, 180, 410, 640, 640, 0}, new int[]{300, 130, 340, 220, 480, 480}, 6);
            g.setColor(new Color(variant == 0 ? 0x294F50 : 0x403D56));
            g.fillPolygon(new int[]{0, 300, 640, 640, 0}, new int[]{380, 240, 410, 480, 480}, 5);
            g.setColor(new Color(0xD4C6A4)); g.fillOval(-150, 410, 950, 200);
            g.dispose();
            ImageIO.write(image, "png", directory.resolve("sample-"+(variant+1)+".png").toFile());
            if (variant == 0) ImageIO.write(image, "jpeg", directory.resolve("sample-1.jpg").toFile());
        }
    }
}

package underad.blackbox.core;

import lombok.AllArgsConstructor;
import lombok.Data;

@AllArgsConstructor
@Data
public class AdvertMetadata {
	private String blockedAbsXpath;
	private String advertRelXpath;
	private String widthWithUnit;
	private String heightWithUnit;
}

package underad.blackbox.core;

import lombok.Data;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Data
public class AdvertMetadata {
	private final long id;
	private final String url;
	private final String blockedAbsXpath;
	private final String advertRelXpath;
	private final String widthWithUnit;
	private final String heightWithUnit;
	/** Encrypted /reconstruct URL. Contains advert ID, so different for each advert. */
	private String encryptedReconstructUrl;
}

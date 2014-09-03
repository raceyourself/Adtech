package underad.blackbox.resources;

import java.net.MalformedURLException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.util.List;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.Response.Status;
import javax.ws.rs.core.UriBuilder;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.joda.time.DateTime;

import underad.blackbox.BlackboxConfiguration;
import underad.blackbox.core.AdvertMetadata;
import underad.blackbox.core.util.Crypto;
import underad.blackbox.jdbi.AdAugmentDao;
import underad.blackbox.jdbi.PublisherPasswordDao;
import underad.blackbox.views.JsIncludeView;

import com.codahale.metrics.annotation.Timed;
import com.google.common.collect.ImmutableList;

@Slf4j
// Path naming gives a clue as to content it provides. A little misleading as it doesn't suggest code gen...
@Path("/include.js")
@Produces("application/javascript")
@RequiredArgsConstructor
public class JsIncludeResource {
	
	private final BlackboxConfiguration configuration;
	private final AdAugmentDao adAugmentDao;
	private final PublisherPasswordDao publisherKeyDao;
	
	private URI getReconstructionUrl(long id) {
		try {
			// TODO need to use UriInfo.getBaseUriBuilder() as well I think
			URI reconstructRelUrl = UriBuilder.fromResource(ReconstructResource.class).path("?id=" + id).build();
			URL hostUrl = configuration.getHostUrl();
			return new URL(hostUrl.getProtocol(), hostUrl.getHost(), hostUrl.getPort(),
					reconstructRelUrl.getPath(), null).toURI();
		} catch (MalformedURLException | URISyntaxException e) {
			throw new WebApplicationException(Status.INTERNAL_SERVER_ERROR);
		}
	}
	
	/**
	 * Returns JavaScript code required to:
	 * 
	 * 1. Detect whether the adverts in the page have been blocked,
	 * 2. Retrieve fresh advert HTML (via ReconstructResource) to replace blocked adverts, including references to new,
	 * 'underad'-style 'adblock-proof' advert resources (images, JS, etc).
	 * 
	 * @param url The page serving the ads, i.e. that will link to this include.
	 * @param publisherUnixTimeSecs Unix time on publisher's server at point of sending request, in seconds.
	 * @return AdBlock-defeating JavaScript.
	 */
	@GET
	@Timed
	public JsIncludeView getInclude(@QueryParam("url") URL url, @QueryParam("unixtime") long publisherUnixTimeSecs) {
		// DateTime(long) expects millis since Unix epoch, not seconds.
		long publisherUnixTimeMillis = publisherUnixTimeSecs * 1000;
		DateTime publisherTs = new DateTime(publisherUnixTimeMillis);
	    
	    // Determine what adverts need obfuscating.
		List<AdvertMetadata> adverts = ImmutableList.copyOf(adAugmentDao.getAdverts(url.toString(), publisherTs));
		if (adverts.isEmpty()) 
			// probably means that the URL isn't owned by one of our publisher clients at present. That or config error.
			throw new WebApplicationException(Status.BAD_REQUEST);
		log.debug("Adverts for URL {}: {}", url, adverts);
		
		// Get appropriate key for encrypting paths.
		String password = publisherKeyDao.getPassword(url.toString(), publisherTs);
//		log.debug("TODO delete me once stuff works!!!! url={}nostril={}", url, password);
		
		for (AdvertMetadata advert : adverts) {
			String reconstructUrl = getReconstructionUrl(advert.getId()).toString();
			log.debug("Reconstruction URL for ad ID {}: {}", advert.getId(), reconstructUrl);
			// The only URL we need to encrypt in the blackbox is the reconstruct URL that provides adblock-proof ad
			// HTML.
			String reconstructUrlCipherText = Crypto.encrypt(password, publisherUnixTimeMillis, reconstructUrl);
			advert.setEncryptedReconstructUrl(reconstructUrlCipherText);
		}
		
		return new JsIncludeView(adverts, publisherUnixTimeSecs);
	}
}

package underad.blackbox.resources;

import java.io.File;
import java.io.IOException;
import java.net.URL;
import java.util.UUID;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response.Status;

import lombok.AllArgsConstructor;

import org.openqa.selenium.Dimension;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;

import com.codahale.metrics.annotation.Timed;
import com.google.common.base.Charsets;
import com.google.common.io.Resources;

@AllArgsConstructor
@Path("/reconstruct")
@Produces(MediaType.TEXT_HTML)
public class ReconstructResource {

	/**
	 * <ol>
	 * <li>Retrieves fresh style information from <code>url</code> for the
	 * advert found at <code>advertXpath</code>.</li>
	 * <li>Determines an appropriate alternative advert for this space.</li>
	 * <li>Returns CSS styles for elements in or below the specified XPath.
	 * </ol>
	 * 
	 * @param url
	 *            Page we need to insert an underad into. Used to retrieve fresh
	 *            style info for the original ad.
	 * @param blockedAbsXpath
	 *            Ad blockers often hide several layers of parent elements of
	 *            the advert itself. This is the absolute path to the top-level
	 *            element hidden by AdBlock. Often these layers are used for
	 *            positioning.
	 * @param advertRelXpath
	 *            Relative path to the element within blockedAbsXpath that
	 *            contains the advert resources.
	 * @return HTML containing an underad appropriate for insertion alongside
	 *         blockedAbsXpath.
	 */
	@GET
	@Timed
	public String reconstructAdvert(@QueryParam("url") String url,
			@QueryParam("blockedAbsXpath") String blockedAbsXpath,
			@QueryParam("advertRelXpath") String advertRelXpath) {
		ChromeOptions options = new ChromeOptions();
		options.addArguments(
				"--start-maximized",
				"--disable-java",
				"--incognito",
				"--use-mock-keychain",
				"--disable-web-security",
				String.format("user-data-dir=/opt/chromedriver/vanilla_profile_%s", UUID.randomUUID()
		));
		// TODO add ad detector plugin; use it to determine advert positioning.
		//options.addExtensions(new File("/path/to/extension.crx"));
		ChromeDriver driver = new ChromeDriver(options);
		
		// The statements below should be redundant given the startup arg --start-maximized.
		driver.manage().window().setSize(new Dimension(1920, 1200));
		driver.manage().window().maximize();
		
		// No wait for readystate:
		// http://stackoverflow.com/questions/15122864/selenium-wait-until-document-is-ready suggests that
		// WebDriver.get() already waits for document.readyState==complete, and then some.
		driver.get(url);
				
		URL resUrl = Resources.getResource("chrome_resolve_styling.js");
		String scriptContent;
		try {
			scriptContent = Resources.toString(resUrl, Charsets.UTF_8);
		} catch (IOException e) {
			throw new WebApplicationException(Status.INTERNAL_SERVER_ERROR);
		}
		driver.executeScript(scriptContent, blockedAbsXpath, advertRelXpath);
		
		driver.quit();

		return null;
	}
}

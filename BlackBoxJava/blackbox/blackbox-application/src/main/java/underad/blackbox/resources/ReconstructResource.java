package underad.blackbox.resources;

import java.io.File;
import java.io.IOException;
import java.io.StringWriter;
import java.util.Map;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response.Status;

import lombok.RequiredArgsConstructor;

import org.openqa.selenium.Dimension;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;

import underad.blackbox.BlackboxConfiguration;

import com.codahale.metrics.annotation.Timed;
import com.github.mustachejava.DefaultMustacheFactory;
import com.github.mustachejava.Mustache;
import com.github.mustachejava.MustacheFactory;
import com.google.common.collect.ImmutableMap;
import com.google.common.io.Files;

@RequiredArgsConstructor
@Path("/reconstruct")
@Produces(MediaType.TEXT_HTML)
public class ReconstructResource {

	private final BlackboxConfiguration configuration;
	
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
		
		File userDataDir = Files.createTempDir();
		
		ChromeOptions options = new ChromeOptions();
		options.addArguments(
				"--start-maximized",
				"--disable-java",
				"--incognito",
				"--disable-extensions", // TODO when linking in Ad Detector extension, work out how to disable the others
				"--use-mock-keychain",
				"--disable-web-security",
				"user-data-dir=" + userDataDir.getAbsolutePath()
		);
		// TODO add ad detector plugin; use it to determine advert positioning.
		//options.addExtensions(new File("/path/to/extension.crx"));
		
		File chromeDriverPath = configuration.getChromeDriverPath();
		if (chromeDriverPath != null) // not required as may be set in path
			System.setProperty("webdriver.chrome.driver", chromeDriverPath.getAbsolutePath());
		
		ChromeDriver driver = null;
		try {
			driver = new ChromeDriver(options);
			
			// The statements below should be redundant given the startup arg --start-maximized.
			driver.manage().window().setSize(new Dimension(1920, 1200));
			driver.manage().window().maximize();
			
			// No wait for readystate:
			// http://stackoverflow.com/questions/15122864/selenium-wait-until-document-is-ready suggests that
			// WebDriver.get() already waits for document.readyState==complete, and then some.
			driver.get(url);

			// Slightly overengineered for what boils down to a trivial string replacement, but hey, we're using
			// Mustache elsewhere, so...
			Map<String, String> scopes = ImmutableMap.of(
					"blockedAbsXpath", blockedAbsXpath, "advertRelXpath", advertRelXpath);
			MustacheFactory mf = new DefaultMustacheFactory();
			Mustache template = mf.compile("underad/blackbox/resources/chrome_resolve_styling.js.mustache");
			StringWriter writer = new StringWriter();
			template.execute(writer, scopes).flush();
			String scriptContent = writer.toString();
			
			WebElement htmlFragment = (WebElement) driver.executeScript(scriptContent, blockedAbsXpath, advertRelXpath);
			return htmlFragment.getAttribute("outerHTML"); // outerHTML doesn't work in FF apparently
		} catch (IOException e) {
			throw new WebApplicationException(Status.INTERNAL_SERVER_ERROR);
		}
		finally {
			if (driver != null)
				driver.quit();
		}
	}
}

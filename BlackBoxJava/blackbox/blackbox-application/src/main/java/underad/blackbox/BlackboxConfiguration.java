package underad.blackbox;

import io.dropwizard.Configuration;
import io.dropwizard.client.HttpClientConfiguration;
import io.dropwizard.db.DataSourceFactory;

import java.io.File;

import javax.validation.Valid;
import javax.validation.constraints.NotNull;

import lombok.Getter;
import lombok.Setter;

import com.fasterxml.jackson.annotation.JsonProperty;

@Getter
@Setter
public class BlackboxConfiguration extends Configuration {
	/**
	 * Used when returning an obfuscated http://[hostname]/reconstruct URL inside JsIncludeResource. Should include the
	 * scheme, host, and an optional port. URL used in preference to URI, against common practice (URL's equals() is
	 * 'broken') for the sake of stricter validation.
	 */
	@JsonProperty
	private String blackBoxProxyPath;
	
	@JsonProperty
	/**
	 * If unspecified, WebDriver searches the $PATH.
	 */
	private File chromeDriverPath;
	
	/**
	 * Should JavaScript be minified before being sent back to the client?
	 */
	private boolean minifyJs;
	
	@Valid
	@NotNull
	@JsonProperty("database")
	private DataSourceFactory dataSourceFactory = new DataSourceFactory();
	@Valid
	@NotNull
	@JsonProperty
	private HttpClientConfiguration httpClient = new HttpClientConfiguration();
}

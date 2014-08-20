package underad.blackbox.views;

import io.dropwizard.views.View;

import java.util.List;

import lombok.Getter;
import lombok.Setter;
import lombok.experimental.Accessors;
import underad.blackbox.core.AdvertMetadata;

@Getter
@Setter
// Mustache works off fluent getters...
// Hmm. Accessors is marked in Lombok as experimental but likely to become
// non-experimental soon...
@Accessors(fluent = true)
public class JsIncludeView extends View {
	private String reconstructUrl;
	private List<AdvertMetadata> adverts;
	
	public JsIncludeView(String reconstructUrl, List<AdvertMetadata> adverts) {
		super("underad.js.mustache");
		this.reconstructUrl = reconstructUrl;
		this.adverts = adverts;
	}
}

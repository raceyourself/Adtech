package underad.statistics.views;

import io.dropwizard.views.View;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.Accessors;

@Getter
@Setter
@Accessors(fluent = true)
public class IndexView extends View {
    private static final String TEMPLATE = "index.mustache";

    public IndexView() {
        super(TEMPLATE);
    }
}

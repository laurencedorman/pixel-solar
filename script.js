function createSun() {
  const now = new Date();
  const day = new Date(+now).setUTCHours(0, 0, 0, 0);
  const t = solar.century(now);
  const longitude = ((day - now) / 864e5) * 360 - 180;
  return [longitude - solar.equationOfTime(t) / 4, solar.declination(t)];
}

function init() {
  Promise.all([
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/land-50m.json").then(
      response => response.json()
    ),
    d3.csv(
      "https://gist.githubusercontent.com/laurencedorman/b6479c427e8ce5cb88759cc2506091db/raw/fbdddbb8b71d0543afa8619351a70b32d11a3fa2/cabincrew.csv",
      d3.autoType
    )
  ]).then(([world, data]) => {
    const container = document.getElementById("container");
    const padding = 8;
    const width =
      window.innerWidth > 1000 ? 1000 : window.innerWidth - padding * 2;
    const height = window.innerHeight - padding * 2;
    const land = topojson.feature(world, world.objects.land);
    const graticule = d3.geoGraticule10();
    const sphere = { type: "Sphere" };
    const projection = d3
      .geoNaturalEarth1()
      .fitExtent([[padding, padding], [width - padding / 1.5, height]], land);
    const antipode = ([longitude, latitude]) => [longitude + 180, -latitude];
    const sun = createSun();
    const night = d3
      .geoCircle()
      .radius(90)
      .center(antipode(sun))();

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    container.appendChild(canvas);

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);

    container.appendChild(svg);

    const context = canvas.getContext("2d");

    const path = d3.geoPath(projection, context);
    context.beginPath(),
      path(graticule),
      (context.strokeStyle = "#ccc"),
      context.stroke();
    context.beginPath(),
      path(sphere),
      (context.fillStyle = "rgba(0,0,0,0.7)"),
      context.fill(),
      (context.strokeStyle = "#000"),
      context.stroke();
    context.beginPath(),
      path(land),
      (context.strokeStyle = "#fff"),
      context.stroke(),
      (context.fillStyle = "rgba(0,0,0,0.7)"),
      context.fill();
    context.beginPath(),
      path(night),
      (context.fillStyle = "rgba(0,0,0,0.8)"),
      context.fill();

    const type = d3.annotationCallout;

    const annotations = data.map(
      ({ title, city, latitude, longitude, timezone, dx = 10, dy = 10 }) => {
        // City dots
        const transform = projection([longitude, latitude]).join(",");

        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("transform", `translate(${transform})`);

        const circle = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "circle"
        );
        circle.setAttribute("r", 4);

        g.appendChild(circle);

        svg.appendChild(g);

        // Annotations
        const [x, y] = projection([longitude, latitude]);

        const time = spacetime.now(timezone);

        return {
          note: {
            bgPadding: { top: 5, left: 5, right: 5, bottom: 5 },
            label: `${city} ${time.time()}`,
            title
          },
          x,
          y,
          dx,
          dy
        };
      }
    );

    const makeAnnotations = d3
      .annotation()
      .notePadding(10)
      .type(type)
      .annotations(annotations);

    d3.select("svg")
      .append("g")
      .attr("class", "annotation-group")
      .call(makeAnnotations);
  });
}

document.addEventListener("DOMContentLoaded", init);

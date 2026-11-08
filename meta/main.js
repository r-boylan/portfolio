import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let xScale;
let yScale;

async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));

  return data;
}

function processCommits(data) {
    return d3
      .groups(data, (d) => d.commit)
      .map(([commit, lines]) => {
        let first = lines[0];

        let { author, date, time, timezone, datetime } = first;

        let ret = {
          id: commit,
          url: 'https://github.com/r-boylan/portfolio/commit/' + commit,
          author,
          date,
          time,
          timezone,
          datetime,
          hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
          totalLines: lines.length,
        };

        Object.defineProperty(ret, 'lines', {
          value: lines,
          enumerable: false,
        });

        return ret;
      });
}

function renderCommitInfo(data, commits) {
    // Create the dl element
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');

    // Add total LOC
    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(data.length);

    // Add total commits
    dl.append('dt').text('Total commits');
    dl.append('dd').text(commits.length);

    // Add number of files
    const fileCount = d3.group(data, (d) => d.file).size;
    dl.append('dt').text('Number of files');
    dl.append('dd').text(fileCount);

    // Add average line length
    const averageLength = d3.mean(data, (d) => d.length);
    dl.append('dt').text('Average line length');
    dl.append('dd').text(averageLength.toFixed(2));

    // Add longest line length
    const longestLine = d3.max(data, (d) => d.length);
    dl.append('dt').text('Longest line length');
    dl.append('dd').text(longestLine);

    // Add maximum depth
    const maxDepth = d3.max(data, (d) => d.depth);
    dl.append('dt').text('Maximum depth');
    dl.append('dd').text(maxDepth);

    // Add average file length
    const fileLengths = d3.rollups(
      data,
      (v) => d3.max(v, (v) => v.line),
      (d) => d.file,
    );

    const averageFileLength = d3.mean(
      fileLengths,
      (d) => d[1],
    );

    dl.append('dt').text('Average file length');
    dl.append('dd').text(averageFileLength.toFixed(2));
}

function renderTooltipContent(commit) {
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
    const time = document.getElementById('commit-time');
    const author = document.getElementById('commit-author');
    const lines = document.getElementById('commit-lines');

    if (Object.keys(commit).length === 0) return;

    link.href = commit.url;
    link.textContent = commit.id;

    date.textContent = commit.datetime?.toLocaleString('en', {
      dateStyle: 'full',
    });

    time.textContent = commit.datetime?.toLocaleTimeString('en');

    author.textContent = commit.author;

    lines.textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.clientX}px`;
    tooltip.style.top = `${event.clientY}px`;
}

function createBrushSelector(svg) {
    // Create brush
    svg.call(d3.brush());

    // Raise dots and everything after the overlay
    svg.selectAll('.dots, .overlay ~ *').raise();
}

function renderScatterPlot(data, commits) {
    // Define dimensions
    const width = 1000;
    const height = 600;

    // Define margins
    const margin = { top: 10, right: 10, bottom: 50, left: 20 };

    // Create the SVG
    const svg = d3
      .select('#chart')
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('overflow', 'visible');

    createBrushSelector(svg);

    // Define the usable area
    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
      };

    // Create the X scale for dates
    xScale = d3
      .scaleTime()
      .domain(d3.extent(commits, (d) => d.datetime))
      .range([usableArea.left, usableArea.right])
      .nice();

    // Create the Y scale for time of day
    yScale = d3
      .scaleLinear()
      .domain([0, 24])
      .range([usableArea.bottom, usableArea.top]);
    // Calculate the range of lines edited
    const [minLines, maxLines] = d3.extent(
      commits,
      (d) => d.totalLines,
    );

    console.log('Minimum lines:', minLines);
    console.log('Maximum lines:', maxLines);

    // Create the radius scale
    const rScale = d3
      .scaleSqrt()
      .domain([minLines, maxLines])
      .range([2, 30]);

     // Sort commits by total lines in descending order
    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

    // Create the dots
    const dots = svg.append('g').attr('class', 'dots');

    dots
        .selectAll('circle')
        .data(sortedCommits)
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', (d) => rScale(d.totalLines))
        .attr('fill', 'steelblue')
        .style('fill-opacity', 0.7)
        .on('mouseenter', (event, commit) => {
            d3.select(event.currentTarget)
              .style('fill-opacity', 1);
            renderTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mouseleave', (event) => {
            d3.select(event.currentTarget)
              .style('fill-opacity', 0.7);
            updateTooltipVisibility(false);
        });

    // Add gridlines BEFORE the axes
    const gridlines = svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);
  
    // Create gridlines as an axis with no labels and full-width ticks
    gridlines.call(
        d3.axisLeft(yScale)
          .tickFormat('')
          .tickSize(-usableArea.width)
      );

    // Create the axes
    const xAxis = d3.axisBottom(xScale);

    const yAxis = d3
      .axisLeft(yScale)
      .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

    // Add X axis
    svg
        .append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(xAxis)
        .selectAll('text')
        .attr('font-size', 12);

    // Add Y axis
    svg
      .append('g')
      .attr('transform', `translate(${usableArea.left}, 0)`)
      .call(yAxis);
}

let data = await loadData();
let commits = processCommits(data);

renderCommitInfo(data, commits);
renderScatterPlot(data, commits);
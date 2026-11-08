import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

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

function renderScatterPlot(data, commits) {
    // Define dimensions
    const width = 1000;
    const height = 600;

    // Create the SVG
    const svg = d3
      .select('#chart')
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('overflow', 'visible');

    // Create the X scale for dates
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(commits, (d) => d.datetime))
      .range([0, width])
      .nice();

    // Create the Y scale for time of day
    const yScale = d3.scaleLinear()
      .domain([0, 24])
      .range([height, 0]);

    // Create the dots
    const dots = svg.append('g').attr('class', 'dots');

    dots
      .selectAll('circle')
      .data(commits)
      .join('circle')
      .attr('cx', (d) => xScale(d.datetime))
      .attr('cy', (d) => yScale(d.hourFrac))
      .attr('r', 5)
      .attr('fill', 'steelblue');
}

let data = await loadData();
let commits = processCommits(data);

renderCommitInfo(data, commits);
renderScatterPlot(data, commits);